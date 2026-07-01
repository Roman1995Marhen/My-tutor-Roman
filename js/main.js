(function () {
  "use strict";

  var burger = document.querySelector(".burger");
  var nav = document.querySelector(".nav");
  var navBackdrop = document.querySelector(".nav-backdrop");

  if (burger && nav) {
    function closeMenu() {
      burger.classList.remove("burger--open");
      nav.classList.remove("nav--open");
      if (navBackdrop) {
        navBackdrop.classList.remove("nav-backdrop--visible");
      }
      document.body.classList.remove("menu-open");
    }

    burger.addEventListener("click", function () {
      burger.classList.toggle("burger--open");
      nav.classList.toggle("nav--open");
      if (navBackdrop) {
        navBackdrop.classList.toggle("nav-backdrop--visible");
      }
      document.body.classList.toggle("menu-open", nav.classList.contains("nav--open"));
    });

    nav.querySelectorAll(".nav__link").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });

    if (navBackdrop) {
      navBackdrop.addEventListener("click", closeMenu);
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });
  }

  var currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__link").forEach(function (link) {
    var href = link.getAttribute("href");
    if (href === currentPage || (currentPage === "" && href === "index.html")) {
      link.classList.add("nav__link--active");
    }
  });

  var form = document.getElementById("booking-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var success = document.querySelector(".form__success");
      if (success) {
        success.classList.add("form__success--visible");
        form.reset();
        setTimeout(function () {
          success.classList.remove("form__success--visible");
        }, 5000);
      }
    });
  }

  var reviewForm = document.getElementById("review-form");
  var ratingInput = document.getElementById("review-rating");
  var ratingHint = document.getElementById("rating-hint");
  var starButtons = document.querySelectorAll(".star-btn");
  var reviewsList = document.getElementById("reviews-list");
  var reviewsScore = document.getElementById("reviews-score");
  var reviewsStars = document.getElementById("reviews-stars");
  var reviewsCount = document.getElementById("reviews-count");
  var reviewsApiUrl = "/.netlify/functions/reviews";

  function createStars(rating) {
    var value = Number(rating) || 0;
    return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getReviewWord(count) {
    var mod10 = count % 10;
    var mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return "отзыв";
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return "отзыва";
    }
    return "отзывов";
  }

  function formatReviewDate(value) {
    if (!value) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat("ru", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(new Date(value));
    } catch (error) {
      return "";
    }
  }

  function setReviewsLoading() {
    if (reviewsList) {
      reviewsList.innerHTML = '<div class="empty-reviews">Загружаем отзывы...</div>';
    }
  }

  function setReviewsEmpty(message) {
    if (reviewsList) {
      reviewsList.innerHTML = '<div class="empty-reviews">' + escapeHtml(message) + "</div>";
    }
    if (reviewsScore) {
      reviewsScore.textContent = "0.0";
    }
    if (reviewsStars) {
      reviewsStars.textContent = "★★★★★";
    }
    if (reviewsCount) {
      reviewsCount.textContent = "Пока нет отзывов";
    }
  }

  function renderReviews(reviews) {
    if (!reviewsList) {
      return;
    }

    if (!reviews.length) {
      setReviewsEmpty("Пока нет опубликованных отзывов.");
      return;
    }

    var total = reviews.reduce(function (sum, review) {
      return sum + Number(review.rating);
    }, 0);
    var average = total / reviews.length;

    reviewsList.innerHTML = reviews.map(function (review) {
      var date = formatReviewDate(review.createdAt);

      return (
        '<article class="review-card">' +
        '<div class="review-card__top">' +
        "<div>" +
        '<p class="review-card__name">' + escapeHtml(review.name) + "</p>" +
        '<p class="review-card__course">' + escapeHtml(review.course) + "</p>" +
        (date ? '<p class="review-card__date">' + escapeHtml(date) + "</p>" : "") +
        "</div>" +
        '<div class="review-card__stars" aria-label="Оценка ' + escapeHtml(review.rating) + ' из 5">' + createStars(review.rating) + "</div>" +
        "</div>" +
        '<p class="review-card__text">' + escapeHtml(review.comment) + "</p>" +
        "</article>"
      );
    }).join("");

    if (reviewsScore) {
      reviewsScore.textContent = average.toFixed(1);
    }
    if (reviewsStars) {
      reviewsStars.textContent = createStars(Math.round(average));
    }
    if (reviewsCount) {
      reviewsCount.textContent = reviews.length + " " + getReviewWord(reviews.length);
    }
  }

  function loadReviews() {
    if (!reviewsList) {
      return;
    }

    if (window.location.protocol === "file:") {
      setReviewsEmpty("Отзывы загрузятся после публикации сайта на Netlify или запуска через netlify dev.");
      return;
    }

    setReviewsLoading();

    fetch(reviewsApiUrl)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Не удалось загрузить отзывы.");
        }
        return response.json();
      })
      .then(function (data) {
        renderReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch(function () {
        setReviewsEmpty("Не удалось загрузить отзывы. Попробуйте обновить страницу.");
      });
  }

  function setRating(value) {
    if (!ratingInput) {
      return;
    }

    if (!value) {
      ratingInput.value = "";
      starButtons.forEach(function (button) {
        button.classList.remove("is-active");
        button.setAttribute("aria-checked", "false");
      });
      if (ratingHint) {
        ratingHint.textContent = "Выберите оценку от 1 до 5";
      }
      return;
    }

    ratingInput.value = value;
    starButtons.forEach(function (button) {
      var isActive = Number(button.dataset.rating) <= Number(value);
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-checked", String(Number(button.dataset.rating) === Number(value)));
    });

    if (ratingHint) {
      ratingHint.textContent = value + " из 5";
    }
  }

  function setReviewFormState(isLoading) {
    if (!reviewForm) {
      return;
    }

    var submitButton = reviewForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = isLoading;
      submitButton.textContent = isLoading ? "Отправляем..." : "Опубликовать отзыв";
    }
  }

  function showReviewMessage(message, isError) {
    var reviewSuccess = document.getElementById("review-success");
    if (!reviewSuccess) {
      return;
    }

    reviewSuccess.textContent = message;
    reviewSuccess.classList.toggle("form__success--error", Boolean(isError));
    reviewSuccess.classList.add("form__success--visible");

    if (!isError) {
      setTimeout(function () {
        reviewSuccess.classList.remove("form__success--visible");
      }, 7000);
    }
  }

  if (starButtons.length) {
    starButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setRating(button.dataset.rating);
      });
    });
  }

  if (reviewForm) {
    loadReviews();

    reviewForm.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!ratingInput.value) {
        if (ratingHint) {
          ratingHint.textContent = "Сначала выберите оценку";
        }
        return;
      }

      if (window.location.protocol === "file:") {
        showReviewMessage("Отправка отзывов работает после публикации на Netlify или запуска через netlify dev.", true);
        return;
      }

      var payload = {
        name: reviewForm.elements.name.value.trim(),
        course: reviewForm.elements.course.value,
        rating: Number(ratingInput.value),
        comment: reviewForm.elements.comment.value.trim(),
        botField: reviewForm.elements["bot-field"] ? reviewForm.elements["bot-field"].value : ""
      };

      setReviewFormState(true);

      fetch(reviewsApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              throw new Error(data.error || "Не удалось отправить отзыв.");
            }
            return data;
          });
        })
        .then(function () {
          reviewForm.reset();
          setRating("");
          showReviewMessage("Спасибо! Отзыв отправлен на модерацию и появится после проверки.", false);
        })
        .catch(function (error) {
          showReviewMessage(error.message || "Не удалось отправить отзыв. Попробуйте позже.", true);
        })
        .finally(function () {
          setReviewFormState(false);
        });
    });
  }

  var revealItems = document.querySelectorAll(".card, .info-block, .quick-nav__item, .trust-card, .review-panel, .step, .cta-banner");
  if ("IntersectionObserver" in window && revealItems.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0 });

    revealItems.forEach(function (item) {
      item.classList.add("reveal");
      revealObserver.observe(item);
    });
  }
})();