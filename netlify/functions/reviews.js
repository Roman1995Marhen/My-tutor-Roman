const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "code-tutor-reviews";
const REVIEW_PREFIX = "review-";
const APPROVED_INDEX_KEY = "approved-reviews";
const MAX_REVIEWS = 1000;

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(payload)
  };
}

function parseBody(event) {
  if (!event.body) {
    return {};
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  try {
    return JSON.parse(body);
  } catch (error) {
    return null;
  }
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeReview(input) {
  const name = cleanText(input.name, 80);
  const course = cleanText(input.course, 140);
  const comment = cleanText(input.comment, 1000);
  const rating = Number(input.rating);

  if (name.length < 2) {
    return { error: "Укажите имя минимум из 2 символов." };
  }

  if (!course) {
    return { error: "Выберите проект обучения." };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Выберите оценку от 1 до 5." };
  }

  if (comment.length < 10) {
    return { error: "Напишите комментарий минимум из 10 символов." };
  }

  return { name, course, rating, comment };
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

function toPublicReview(review) {
  return {
    id: review.id,
    name: review.name,
    course: review.course,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt
  };
}

async function getApprovedReviews(store) {
  const cachedReviews = await store.get(APPROVED_INDEX_KEY, { type: "json" });
  if (Array.isArray(cachedReviews)) {
    return cachedReviews.slice(0, MAX_REVIEWS);
  }

  const reviews = await listAllReviews(store);
  const approvedReviews = reviews
    .filter((review) => review.status === "approved")
    .slice(0, MAX_REVIEWS)
    .map(toPublicReview);

  await store.setJSON(APPROVED_INDEX_KEY, approvedReviews);
  return approvedReviews;
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const store = getStore(STORE_NAME);

  if (event.httpMethod === "GET") {
    const approvedReviews = await getApprovedReviews(store);
    return json(200, { reviews: approvedReviews });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Метод не поддерживается." });
  }

  const body = parseBody(event);
  if (!body) {
    return json(400, { error: "Некорректные данные формы." });
  }

  if (body.botField || body["bot-field"]) {
    return json(200, { ok: true });
  }

  const normalized = normalizeReview(body);
  if (normalized.error) {
    return json(400, { error: normalized.error });
  }

  const existingReviews = await listAllReviews(store);
  if (existingReviews.length >= MAX_REVIEWS) {
    return json(409, { error: "Достигнут лимит в 1000 отзывов." });
  }

  const id = `${REVIEW_PREFIX}${Date.now()}-${crypto.randomUUID()}`;
  const review = {
    id,
    name: normalized.name,
    course: normalized.course,
    rating: normalized.rating,
    comment: normalized.comment,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await store.setJSON(id, review);

  return json(201, {
    ok: true,
    message: "Отзыв отправлен на модерацию."
  });
};