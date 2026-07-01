const { getStore } = require("@netlify/blobs");

const STORE_NAME = "code-tutor-reviews";
const REVIEW_PREFIX = "review-";
const APPROVED_INDEX_KEY = "approved-reviews";
const ADMIN_PASSWORD = String(process.env.REVIEWS_ADMIN_PASSWORD || "").trim();

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
    },
    body: JSON.stringify(payload)
  };
}

function checkAuth(event) {
  const password = event.headers["x-admin-password"] ||
      event.headers["X-Admin-Password"];

  if (!ADMIN_PASSWORD) {
    console.error("REVIEWS_ADMIN_PASSWORD environment variable is not set");
    return false;
  }

  return String(password || "").trim() === ADMIN_PASSWORD;
}

async function listAllReviews(store) {
  const reviews = [];
  let cursor;
  do {
    const page = await store.list({ prefix: REVIEW_PREFIX, cursor });
    const blobs = page.blobs || [];
    const pageReviews = await Promise.all(
        blobs.map(async (blob) => {
          try {
            return await store.get(blob.key, { type: "json" });
          } catch (error) {
            return null;
          }
        })
    );
    reviews.push(...pageReviews.filter(Boolean));
    cursor = page.cursor;
  } while (cursor);
  return reviews.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function parseBody(event) {
  if (!event.body) return {};
  const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
  try {
    return JSON.parse(body);
  } catch (error) {
    return null;
  }
}

function publicReview(review) {
  return {
    id: review.id,
    name: review.name,
    course: review.course,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt
  };
}

async function refreshApprovedIndex(store) {
  const allReviews = await listAllReviews(store);
  const approvedReviews = allReviews
      .filter((review) => review.status === "approved")
      .map(publicReview);

  await store.setJSON(APPROVED_INDEX_KEY, approvedReviews);
}

exports.handler = async function (event) {
  try {
    // OPTIONS для CORS
    if (event.httpMethod === "OPTIONS") {
      return json(204, {});
    }

    // Для всех методов админки проверяем пароль.
    if (!checkAuth(event)) {
      return json(401, { error: "Неверный пароль администратора." });
    }

    const store = getStore(STORE_NAME);

    // GET - получить все отзывы (для админки)
    if (event.httpMethod === "GET") {
      const allReviews = await listAllReviews(store);
      return json(200, { reviews: allReviews });
    }

    // PATCH - изменить статус отзыва
    if (event.httpMethod === "PATCH") {
      const body = parseBody(event);
      if (!body || !body.id || !body.status) {
        return json(400, { error: "Не указан ID или статус." });
      }

      const reviewData = await store.get(body.id, { type: "json" });
      if (!reviewData) {
        return json(404, { error: "Отзыв не найден." });
      }

      reviewData.status = body.status;
      reviewData.updatedAt = new Date().toISOString();
      await store.setJSON(body.id, reviewData);
      await refreshApprovedIndex(store);

      return json(200, { success: true, review: reviewData });
    }

    // DELETE - удалить отзыв
    if (event.httpMethod === "DELETE") {
      const body = parseBody(event);
      if (!body || !body.id) {
        return json(400, { error: "Не указан ID отзыва." });
      }

      await store.delete(body.id);
      await refreshApprovedIndex(store);

      return json(200, { success: true });
    }

    return json(405, { error: "Метод не поддерживается." });
  } catch (error) {
    console.error("Admin reviews function error:", error);
    return json(500, {
      error: "Ошибка функции Netlify. Проверьте, что Blobs доступны и переменная REVIEWS_ADMIN_PASSWORD задана для Functions."
    });
  }
};
