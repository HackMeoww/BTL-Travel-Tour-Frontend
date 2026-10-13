document.addEventListener("DOMContentLoaded", async function () {
    const invoiceCard = document.querySelector(".invoice-card");
    const token = localStorage.getItem("token");

    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get("invoiceId");

    function formatPrice(price) {
        return Number(price).toLocaleString("vi-VN") + " VNĐ";
    }

    if (!token) {
        alert("Bạn cần đăng nhập để xem hóa đơn.");
        window.location.href = "login.html";
        return;
    }

    if (!invoiceId) {
        invoiceCard.innerHTML = "<p>Không tìm thấy mã hóa đơn.</p>";
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/Invoice/${invoiceId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error("Không thể tải thông tin hóa đơn.");
        }

        const invoice = await response.json();

        invoiceCard.innerHTML = `
            <h2>Hóa đơn #${invoice.invoiceId}</h2>

            <div class="summary-item">
                <span>Mã hóa đơn</span>
                <strong>${invoice.invoiceId}</strong>
            </div>

            <div class="summary-item">
                <span>Mã Booking</span>
                <strong>${invoice.bookingId}</strong>
            </div>

            <div class="summary-item">
                <span>Ngày lập</span>
                <strong>
                    ${new Date(invoice.invoiceDate).toLocaleString("vi-VN")}
                </strong>
            </div>

            <div class="summary-item">
                <span>Tổng tiền</span>
                <strong>${formatPrice(invoice.amount)}</strong>
            </div>

            <div class="summary-total">
                <span>Trạng thái</span>
                <strong>${invoice.paymentStatus}</strong>
            </div>
        `;
    } catch (error) {
        console.error(error);
        invoiceCard.innerHTML =
            "<p>Không thể tải hóa đơn. Vui lòng thử lại.</p>";
    }
});