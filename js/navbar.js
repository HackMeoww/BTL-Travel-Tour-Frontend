/**
 * navbar.js - Đồng bộ thanh Navigation Bar gọn gàng, sinh động & responsive trên toàn bộ website Travel Tour
 */
(function () {
    function initNavbar() {
        const navbar = document.querySelector(".navbar");
        const menu = document.querySelector(".menu");
        const header = document.querySelector(".header");
        if (!navbar || !menu) return;

        // Xác định đường dẫn: trang hiện tại nằm ở thư mục gốc hay trong thư mục pages/
        const pathname = window.location.pathname.toLowerCase().replace(/\\/g, "/");
        const isRoot = !pathname.includes("/pages/");
        const basePath = isRoot ? "pages/" : "";
        const homePath = isRoot ? "index.html" : "../index.html";

        // ==========================================
        // 1. ĐỒNG BỘ LOGO VỚI ICON BAY SINH ĐỘNG
        // ==========================================
        let logo = document.querySelector(".navbar .logo");
        if (logo) {
            if (logo.tagName.toLowerCase() !== "a") {
                const a = document.createElement("a");
                a.className = logo.className;
                a.href = homePath;
                logo.parentNode.replaceChild(a, logo);
                logo = a;
            } else {
                logo.setAttribute("href", homePath);
            }

            logo.innerHTML = `
                <span class="nav-logo-icon" aria-hidden="true">✈️</span>
                <span class="nav-logo-text">Travel<span class="nav-logo-accent">Tour</span></span>
            `;
        }

        // ==========================================
        // 2. ĐỌC THÔNG TIN TÀI KHOẢN NGƯỜI DÙNG
        // ==========================================
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        let user = null;

        if (token && userData) {
            try {
                user = JSON.parse(userData);
            } catch (err) {
                console.error("Lỗi đọc dữ liệu người dùng:", err);
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }

        const role = user ? (user.role || "") : "";
        const rawName = user ? (user.userName || user.name || "Khách hàng") : "";
        const userName = rawName.length > 15 ? rawName.substring(0, 15) + "…" : rawName;
        const userInitial = rawName ? rawName.charAt(0).toUpperCase() : "U";

        let roleLabel = "";
        let roleClass = "role-customer";
        if (role === "Admin") {
            roleLabel = "Admin";
            roleClass = "role-admin";
        } else if (role === "Staff") {
            roleLabel = "Staff";
            roleClass = "role-staff";
        } else if (role === "Customer") {
            roleLabel = "Khách";
            roleClass = "role-customer";
        }

        // ==========================================
        // 3. XÂY DỰNG GIAO DIỆN MENU GỌN GÀNG & SINH ĐỘNG
        // ==========================================
        let mainLinksHtml = `
            <a href="${homePath}" data-nav="home" class="nav-item">
                <span class="nav-item-icon">🏠</span>
                <span class="nav-item-text">Trang chủ</span>
            </a>
        `;

        if (role === "Admin") {
            mainLinksHtml += `
                <a href="${basePath}admin-tours.html" data-nav="admin-tours" class="nav-item">
                    <span class="nav-item-icon">🧭</span>
                    <span class="nav-item-text">Quản lý Tour</span>
                </a>
                <a href="${basePath}admin-bookings.html" data-nav="admin-bookings" class="nav-item">
                    <span class="nav-item-icon">📑</span>
                    <span class="nav-item-text">Quản lý Booking</span>
                </a>
                <a href="${basePath}admin.html" data-nav="admin" class="nav-item">
                    <span class="nav-item-icon">📊</span>
                    <span class="nav-item-text">Dashboard</span>
                </a>
            `;
        } else if (role === "Staff") {
            mainLinksHtml += `
                <a href="${basePath}tours.html" data-nav="tours" class="nav-item">
                    <span class="nav-item-icon">🧭</span>
                    <span class="nav-item-text">Tour</span>
                </a>
                <a href="${basePath}admin-bookings.html" data-nav="admin-bookings" class="nav-item">
                    <span class="nav-item-icon">📑</span>
                    <span class="nav-item-text">Quản lý Booking</span>
                </a>
            `;
        } else {
            // Khách vãng lai hoặc tài khoản Customer
            mainLinksHtml += `
                <a href="${basePath}tours.html" data-nav="tours" class="nav-item">
                    <span class="nav-item-icon">🧭</span>
                    <span class="nav-item-text">Tour</span>
                </a>
            `;
            if (token && user && role === "Customer") {
                mainLinksHtml += `
                    <a href="${basePath}my-bookings.html" data-nav="my-bookings" class="nav-item">
                        <span class="nav-item-icon">🎫</span>
                        <span class="nav-item-text">Đơn đặt tour</span>
                    </a>
                `;
            }
        }

        let userActionsHtml = "";
        if (token && user) {
            userActionsHtml = `
                <div class="nav-user-container">
                    <div class="nav-user-pill" title="Tài khoản: ${rawName} (${role || 'Khách hàng'})">
                        <span class="nav-user-avatar">${userInitial}</span>
                        <span class="nav-user-name">${userName}</span>
                        ${roleLabel ? `<span class="nav-role-badge ${roleClass}">${roleLabel}</span>` : ""}
                    </div>
                    <button type="button" class="nav-btn-logout" id="logoutLink" title="Đăng xuất khỏi hệ thống">
                        <span class="nav-logout-icon">🚪</span>
                        <span class="nav-logout-text">Đăng xuất</span>
                    </button>
                </div>
            `;
        } else {
            userActionsHtml = `
                <div class="nav-auth-container">
                    <a href="${basePath}login.html" data-nav="login" class="nav-btn-login" id="loginLink">
                        <span class="nav-login-icon">🔑</span>
                        <span>Đăng nhập</span>
                    </a>
                </div>
            `;
        }

        menu.innerHTML = `
            <div class="nav-main-links">
                ${mainLinksHtml}
            </div>
            <div class="nav-actions-area">
                ${userActionsHtml}
            </div>
        `;

        // ==========================================
        // 4. NÚT HAMBURGER MOBILE MENU SINH ĐỘNG
        // ==========================================
        let navToggle = navbar.querySelector(".nav-toggle");
        if (!navToggle) {
            navToggle = document.createElement("button");
            navToggle.type = "button";
            navToggle.className = "nav-toggle";
            navToggle.id = "navToggle";
            navToggle.setAttribute("aria-label", "Mở menu điều hướng");
            navToggle.innerHTML = `
                <span class="bar bar-1"></span>
                <span class="bar bar-2"></span>
                <span class="bar bar-3"></span>
            `;
            navbar.appendChild(navToggle);
        }

        // Bật/tắt mobile menu
        navToggle.onclick = function (e) {
            e.stopPropagation();
            navbar.classList.toggle("nav-mobile-open");
            navToggle.classList.toggle("active");
        };

        // Đóng menu khi nhấp vào bất kỳ link nào
        menu.querySelectorAll("a, button").forEach(elem => {
            elem.addEventListener("click", function () {
                navbar.classList.remove("nav-mobile-open");
                navToggle.classList.remove("active");
            });
        });

        // Đóng menu khi nhấp ra ngoài
        document.addEventListener("click", function (e) {
            if (!navbar.contains(e.target)) {
                navbar.classList.remove("nav-mobile-open");
                navToggle.classList.remove("active");
            }
        });

        // ==========================================
        // 5. ĐÁNH DẤU TRANG ĐANG XEM (ACTIVE LINK)
        // ==========================================
        let currentNav = "";
        const filename = pathname.substring(pathname.lastIndexOf("/") + 1);

        if (!filename || filename === "index.html") {
            currentNav = "home";
        } else if (filename === "tours.html" || filename === "tour-detail.html") {
            currentNav = "tours";
        } else if (filename === "my-bookings.html") {
            currentNav = "my-bookings";
        } else if (filename === "admin-tours.html") {
            currentNav = "admin-tours";
        } else if (filename === "admin-bookings.html") {
            currentNav = "admin-bookings";
        } else if (filename === "admin.html") {
            currentNav = "admin";
        } else if (filename === "login.html") {
            currentNav = "login";
        }

        if (currentNav) {
            const activeLink = menu.querySelector(`a[data-nav="${currentNav}"]`);
            if (activeLink) {
                activeLink.classList.add("active");
            }
        }

        // ==========================================
        // 6. XỬ LÝ SỰ KIỆN ĐĂNG XUẤT
        // ==========================================
        const logoutBtn = document.getElementById("logoutLink");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", function (e) {
                e.preventDefault();
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("booking");
                window.location.href = isRoot ? "pages/login.html" : "login.html";
            });
        }

        // ==========================================
        // 7. HIỆU ỨNG CUỘN TRANG (STICKY SCROLL HEADER)
        // ==========================================
        if (header) {
            function updateScrollHeader() {
                if (window.scrollY > 15) {
                    header.classList.add("scrolled");
                } else {
                    header.classList.remove("scrolled");
                }
            }
            window.addEventListener("scroll", updateScrollHeader, { passive: true });
            updateScrollHeader();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNavbar);
    } else {
        initNavbar();
    }
})();
