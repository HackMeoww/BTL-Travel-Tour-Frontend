/**
 * navbar.js - Đồng bộ thanh Navigation Bar trên toàn bộ các trang Travel Tour
 */
(function () {
    function initNavbar() {
        const menu = document.querySelector(".menu");
        if (!menu) return;

        // Xác định đường dẫn: trang hiện tại nằm ở thư mục gốc hay trong thư mục pages/
        const pathname = window.location.pathname.toLowerCase().replace(/\\/g, "/");
        const isRoot = !pathname.includes("/pages/");
        const basePath = isRoot ? "pages/" : "";
        const homePath = isRoot ? "index.html" : "../index.html";

        // Đồng bộ logo thành link về trang chủ
        const logo = document.querySelector(".navbar .logo");
        if (logo) {
            if (logo.tagName.toLowerCase() !== "a") {
                const a = document.createElement("a");
                a.className = logo.className;
                a.href = homePath;
                a.innerHTML = logo.innerHTML;
                logo.parentNode.replaceChild(a, logo);
            } else {
                logo.setAttribute("href", homePath);
            }
        }

        // Đọc thông tin token & user từ localStorage
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

        const role = user ? user.role : null;
        const userName = user ? (user.userName || user.name || "Khách hàng") : "";

        // Xây dựng các liên kết điều hướng đồng bộ
        let navHtml = `
            <a href="${homePath}" data-nav="home">Trang chủ</a>
            <a href="${basePath}tours.html" data-nav="tours">Tour</a>
        `;

        if (token && user) {
            if (role === "Customer") {
                navHtml += `<a href="${basePath}my-bookings.html" data-nav="my-bookings">Đơn đặt tour</a>`;
            }

            if (role === "Admin" || role === "Staff") {
                navHtml += `<a href="${basePath}admin-bookings.html" data-nav="admin-bookings">Quản lý Booking</a>`;
            }

            if (role === "Admin") {
                navHtml += `<a href="${basePath}admin.html" data-nav="admin">Dashboard</a>`;
            }

            const roleLabel = role === "Admin" ? "Admin" : (role === "Staff" ? "Staff" : "");
            navHtml += `
                <span class="user-badge" id="navUserBadge" title="Đang đăng nhập với vai trò: ${role || 'Khách hàng'}">
                    👤 ${userName}${roleLabel ? ` (${roleLabel})` : ""}
                </span>
                <a href="#" id="logoutLink">Đăng xuất</a>
            `;
        } else {
            navHtml += `
                <a href="${basePath}login.html" data-nav="login" id="loginLink">Đăng nhập</a>
            `;
        }

        menu.innerHTML = navHtml;

        // Đánh dấu active cho trang hiện tại
        let currentNav = "";
        const filename = pathname.substring(pathname.lastIndexOf("/") + 1);

        if (!filename || filename === "index.html") {
            currentNav = "home";
        } else if (filename === "tours.html" || filename === "tour-detail.html") {
            currentNav = "tours";
        } else if (filename === "my-bookings.html") {
            currentNav = "my-bookings";
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

        // Đăng ký sự kiện Đăng xuất (chuyển sang trang đăng nhập)
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
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNavbar);
    } else {
        initNavbar();
    }
})();
