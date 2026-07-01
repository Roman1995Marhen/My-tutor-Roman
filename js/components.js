(function () {
  "use strict";

  var NAV_ITEMS = [
    { href: "index.html", label: "Главная" },
    { href: "about.html", label: "Обо мне" },
    { href: "subjects.html", label: "Обучение" },
    { href: "pricing.html", label: "Цены" },
    { href: "location.html", label: "Где проходят уроки" },
    { href: "rules.html", label: "Правила" },
    { href: "booking.html", label: "Запись" },
    { href: "contact.html", label: "Контакты" },
    { href: "reviews.html", label: "Отзывы" }
  ];

  function renderHeader() {
    var links = NAV_ITEMS.map(function (item) {
      return '<a href="' + item.href + '" class="nav__link">' + item.label + "</a>";
    }).join("");

    return (
      '<header class="header">' +
      '<div class="container header__inner">' +
      '<a href="index.html" class="logo">' +
      '<span class="logo__icon">&lt;/&gt;</span>' +
      "Code Tutor" +
      "</a>" +
      '<nav class="nav" aria-label="Основная навигация">' +
      links +
      "</nav>" +
      '<button class="nav-backdrop" aria-label="Закрыть меню" type="button"></button>' +
      '<button class="burger" aria-label="Открыть меню" type="button">' +
      "<span></span><span></span><span></span>" +
      "</button>" +
      "</div>" +
      "</header>"
    );
  }

  function renderFooter() {
    var links = NAV_ITEMS.map(function (item) {
      return '<a href="' + item.href + '">' + item.label + "</a>";
    }).join("");

    return (
      '<footer class="footer">' +
      '<div class="container footer__inner">' +
      '<p class="footer__copy">&copy; 2026 Code Tutor — репетитор по программированию</p>' +
      '<div class="footer__links">' +
      links +
      "</div>" +
      "</div>" +
      "</footer>"
    );
  }

  function renderQuickContact() {
    return (
      '<div class="floating-contact" aria-label="Быстрая связь">' +
      '<a class="floating-contact__btn" href="https://t.me/Roman_log1" target="_blank" rel="noopener">Telegram</a>' +
      '<a class="floating-contact__btn floating-contact__btn--warm" href="https://wa.me/380980027166" target="_blank" rel="noopener">WhatsApp</a>' +
      "</div>"
    );
  }

  function ensureEnhancementsStylesheet() {
    if (document.querySelector('link[href="css/enhancements.css"]')) {
      return;
    }

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/enhancements.css";
    document.head.appendChild(link);
  }

  function ensureMeta() {
    if (!document.querySelector('meta[name="description"]')) {
      var description = document.createElement("meta");
      description.name = "description";
      description.content = "Code Tutor — индивидуальные онлайн-занятия по программированию для новичков и продолжающих.";
      document.head.appendChild(description);
    }

    if (!document.querySelector('meta[name="theme-color"]')) {
      var theme = document.createElement("meta");
      theme.name = "theme-color";
      theme.content = "#0b1120";
      document.head.appendChild(theme);
    }

    if (!document.querySelector('link[rel="icon"]')) {
      var icon = document.createElement("link");
      icon.rel = "icon";
      icon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230b1120'/%3E%3Cpath d='M22 22 12 32l10 10M42 22l10 10-10 10M36 14 28 50' fill='none' stroke='%2338bdf8' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
      document.head.appendChild(icon);
    }
  }

  window.SiteComponents = {
    inject: function () {
      ensureEnhancementsStylesheet();
      ensureMeta();

      var headerPlaceholder = document.getElementById("site-header");
      var footerPlaceholder = document.getElementById("site-footer");

      if (headerPlaceholder) {
        headerPlaceholder.outerHTML = renderHeader();
      }
      if (footerPlaceholder) {
        footerPlaceholder.outerHTML = renderFooter();
      }
      if (!document.querySelector(".floating-contact")) {
        document.body.insertAdjacentHTML("beforeend", renderQuickContact());
      }
    }
  };
})();
