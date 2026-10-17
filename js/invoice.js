/**
 * invoice.js - Xử lý tải dữ liệu chi tiết và hiển thị hóa đơn du lịch in ấn A4 chuẩn đẹp
 */

document.addEventListener("DOMContentLoaded", async function () {
    const invoiceSheet = document.getElementById("invoiceSheet");
    const token = localStorage.getItem("token");

    const params = new URLSearchParams(window.location.search);
    let invoiceId = params.get("invoiceId");
    const bookingIdParam = params.get("bookingId");

    // ==========================================
    // 1. CÁC HÀM TIỆN ÍCH ĐỊNH DẠNG DỮ LIỆU
    // ==========================================

    function formatPrice(price) {
        if (!price && price !== 0) return "0 VNĐ";
        return Number(price).toLocaleString("vi-VN") + " VNĐ";
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatDate(dateStr) {
        if (!dateStr) return "Theo lịch hẹn";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function escapeHtml(text) {
        if (!text) return "";
        return String(text).replace(/[&<>"']/g, function (m) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[m];
        });
    }

    // Đọc số tiền thành chữ tiếng Việt chuẩn hóa đơn
    function numberToVietnameseWords(number) {
        const num = Math.floor(Math.abs(Number(number) || 0));
        if (num === 0) return "Không đồng chẵn.";

        const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
        const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

        function readThreeDigits(n, isLeading) {
            const h = Math.floor(n / 100);
            const t = Math.floor((n % 100) / 10);
            const u = n % 10;
            let str = "";

            if (h > 0 || !isLeading) {
                str += units[h] + " trăm ";
            }

            if (t > 1) {
                str += units[t] + " mươi ";
                if (u === 1) str += "mốt ";
                else if (u === 5) str += "lăm ";
                else if (u > 0) str += units[u] + " ";
            } else if (t === 1) {
                str += "mười ";
                if (u === 5) str += "lăm ";
                else if (u > 0) str += units[u] + " ";
            } else {
                if (h > 0 && u > 0) str += "lẻ ";
                if (u > 0) str += units[u] + " ";
            }
            return str;
        }

        let numStr = num.toString();
        const groups = [];
        while (numStr.length > 0) {
            groups.push(parseInt(numStr.slice(-3), 10));
            numStr = numStr.slice(0, -3);
        }

        const words = [];
        for (let i = groups.length - 1; i >= 0; i--) {
            const g = groups[i];
            if (g > 0) {
                const chunk = readThreeDigits(g, i === groups.length - 1).trim();
                if (chunk) {
                    words.push(chunk + " " + scales[i]);
                }
            }
        }

        let result = words.join(" ").trim().replace(/\s+/g, " ");
        result = result.charAt(0).toUpperCase() + result.slice(1) + " đồng chẵn.";
        return result;
    }

    // ==========================================
    // 2. KIỂM TRA ĐIỀU KIỆN BAN ĐẦU
    // ==========================================

    if (!token) {
        alert("Bạn cần đăng nhập để xem thông tin hóa đơn.");
        window.location.href = "login.html";
        return;
    }

    if (!invoiceId && !bookingIdParam) {
        invoiceSheet.innerHTML = `
            <div class="invoice-error">
                <h3>⚠️ Không tìm thấy thông tin hóa đơn</h3>
                <p>Vui lòng cung cấp mã hóa đơn hoặc mã đặt tour hợp lệ.</p>
                <a href="tours.html" class="btn-toolbar-link" style="margin-top: 15px; display: inline-flex;">
                    Quay lại danh sách tour
                </a>
            </div>
        `;
        return;
    }

    // ==========================================
    // 3. TẢI DỮ LIỆU ĐẦY ĐỦ CHO HÓA ĐƠN
    // ==========================================

    async function fetchFullInvoiceData() {
        const authHeaders = {
            "Authorization": `Bearer ${token}`
        };

        // Nếu có bookingId mà chưa có invoiceId, tìm invoice tương ứng trước
        if (!invoiceId && bookingIdParam) {
            try {
                const listRes = await fetch(`${API_BASE_URL}/Invoice`, { headers: authHeaders });
                if (listRes.ok) {
                    const list = await listRes.json();
                    if (Array.isArray(list)) {
                        const matched = list.find(item => Number(item.bookingId) === Number(bookingIdParam));
                        if (matched && matched.invoiceId) {
                            invoiceId = matched.invoiceId;
                        }
                    }
                }
            } catch (err) {
                console.warn("Không thể tìm hóa đơn theo mã đặt tour:", err);
            }
        }

        // Bước 1: Thử gọi API chi tiết hóa đơn (nếu đã có invoiceId và backend hỗ trợ /detail)
        if (invoiceId) {
            try {
                const detailRes = await fetch(`${API_BASE_URL}/Invoice/${invoiceId}/detail`, {
                    headers: authHeaders
                });

                if (detailRes.ok) {
                    const detailData = await detailRes.json();
                    if (detailData && detailData.invoiceId) {
                        return detailData;
                    }
                }
            } catch (e) {
                console.log("Endpoint /detail chưa phản hồi, chuyển sang fallback fetch:", e);
            }
        }

        // Bước 2: Fallback an toàn - Tự động liên kết dữ liệu từ các API độc lập
        let invoice = null;
        let effectiveBookingId = bookingIdParam;

        if (invoiceId) {
            const invoiceRes = await fetch(`${API_BASE_URL}/Invoice/${invoiceId}`, {
                headers: authHeaders
            });

            if (invoiceRes.ok) {
                invoice = await invoiceRes.json();
                effectiveBookingId = invoice.bookingId;
            }
        }

        let booking = null;
        let tour = null;
        let customer = null;
        let payment = null;

        if (effectiveBookingId) {
            try {
                // Tải thông tin Booking
                const bookingRes = await fetch(`${API_BASE_URL}/Booking/${effectiveBookingId}`, {
                    headers: authHeaders
                });
                if (bookingRes.ok) {
                    booking = await bookingRes.json();
                }

                // Tải thông tin Payment để lấy phương thức thanh toán
                const paymentRes = await fetch(`${API_BASE_URL}/Payment`, {
                    headers: authHeaders
                }).catch(() => null);

                if (paymentRes && paymentRes.ok) {
                    const payments = await paymentRes.json();
                    if (Array.isArray(payments)) {
                        payment = payments.find(p => Number(p.bookingId) === Number(effectiveBookingId));
                    }
                }
            } catch (err) {
                console.warn("Không thể tải thông tin booking/payment liên quan:", err);
            }
        }

        // Lấy thông tin Tour
        const tourIdToFetch = booking?.tourId;
        if (tourIdToFetch) {
            try {
                const tourRes = await fetch(`${API_BASE_URL}/Tour/${tourIdToFetch}`);
                if (tourRes.ok) {
                    tour = await tourRes.json();
                }
            } catch (err) {
                console.warn("Không thể tải thông tin tour:", err);
            }
        }

        // Lấy thông tin Khách hàng
        const customerIdToFetch = booking?.customerId;
        if (customerIdToFetch) {
            try {
                const customerRes = await fetch(`${API_BASE_URL}/Customer/${customerIdToFetch}`, {
                    headers: authHeaders
                });
                if (customerRes.ok) {
                    customer = await customerRes.json();
                }
            } catch (err) {
                console.warn("Không thể tải thông tin khách hàng:", err);
            }
        }

        const fallbackAmount = invoice?.amount || booking?.totalPrice || 0;

        return {
            invoiceId: invoice?.invoiceId || (effectiveBookingId ? `BK-${effectiveBookingId}` : "001"),
            invoiceDate: invoice?.invoiceDate || booking?.bookingDate || new Date().toISOString(),
            amount: fallbackAmount,
            paymentStatus: invoice?.paymentStatus || (booking?.status === "Confirmed" ? "Paid" : "Pending"),

            bookingId: booking?.bookingId || effectiveBookingId || 0,
            bookingDate: booking?.bookingDate || invoice?.invoiceDate || new Date().toISOString(),
            departureDate: booking?.departureDate || null,
            numberOfPeople: booking?.numberOfPeople || 1,
            totalPrice: booking?.totalPrice || fallbackAmount,
            bookingStatus: booking?.status || "Confirmed",

            tourId: tour?.tourId || booking?.tourId || 0,
            tourName: tour?.tourName || "Chương trình tour du lịch trọn gói",
            destination: tour?.destination || "Điểm đến du lịch",
            duration: tour?.duration || 1,
            tourPrice: tour?.price || (fallbackAmount / (booking?.numberOfPeople || 1)),

            customerId: customer?.customerId || booking?.customerId || 0,
            customerName: customer?.fullName || "Quý khách hàng",
            customerPhone: customer?.phone || "Chưa cập nhật",
            customerEmail: customer?.email || "Chưa cập nhật",
            customerAddress: customer?.address || "Việt Nam",

            paymentMethod: payment?.paymentMethod || "Chuyển khoản ngân hàng (Banking)",
            paymentDate: payment?.paymentDate || invoice?.invoiceDate || new Date().toISOString()
        };
    }

    // ==========================================
    // 4. RENDER GIAO DIỆN HÓA ĐƠN CHUẨN A4
    // ==========================================

    try {
        const data = await fetchFullInvoiceData();

        const isPaid = (data.paymentStatus || "").toLowerCase() === "paid" || 
                       (data.paymentStatus || "").toLowerCase() === "đã thanh toán" ||
                       (data.bookingStatus || "").toLowerCase() === "confirmed";

        const statusLabel = isPaid ? "ĐÃ THANH TOÁN" : "CHỜ THANH TOÁN";
        const statusClass = isPaid ? "status-paid" : "status-pending";

        const numPeople = Math.max(1, Number(data.numberOfPeople) || 1);
        const unitPrice = Number(data.tourPrice) > 0 ? Number(data.tourPrice) : (Number(data.amount) / numPeople);
        const totalAmount = Number(data.amount) > 0 ? Number(data.amount) : (unitPrice * numPeople);
        const amountWords = numberToVietnameseWords(totalAmount);

        const rawInvoiceId = String(data.invoiceId);
        const formattedInvoiceCode = rawInvoiceId.startsWith("BK-") ? rawInvoiceId : "HD-" + rawInvoiceId.padStart(6, "0");
        const formattedBookingCode = "BK-" + String(data.bookingId).padStart(6, "0");

        // Dịch phương thức thanh toán sang tiếng Việt trang trọng
        let paymentMethodText = data.paymentMethod || "Chuyển khoản ngân hàng";
        const pmLower = paymentMethodText.toLowerCase();
        if (pmLower.includes("banking") || pmLower.includes("transfer") || pmLower.includes("chuyển")) {
            paymentMethodText = "Chuyển khoản ngân hàng (Banking)";
        } else if (pmLower.includes("cash") || pmLower.includes("tiền mặt")) {
            paymentMethodText = "Tiền mặt tại quầy";
        } else if (pmLower.includes("vnpay")) {
            paymentMethodText = "Cổng thanh toán trực tuyến VNPay";
        } else if (pmLower.includes("card") || pmLower.includes("thẻ")) {
            paymentMethodText = "Thẻ ngân hàng / Visa / Master";
        }

        invoiceSheet.innerHTML = `
            <!-- HEADER HÓA ĐƠN -->
            <div class="invoice-header">
                <div class="company-branding">
                    <div class="company-logo">
                        <span>✈️</span>
                        <span>Travel Tour</span>
                    </div>
                    <div class="company-name">
                        Công ty TNHH Dịch vụ và Du lịch Travel Tour
                    </div>
                    <div class="company-details">
                        <p>📍 <strong>Trụ sở chính:</strong> Tầng 6, Tòa nhà Travel Tour, Cầu Giấy, Hà Nội</p>
                        <p>📞 <strong>Tổng đài hỗ trợ:</strong> 1900 6868 &nbsp;|&nbsp; <strong>Hotline:</strong> 0988 888 999</p>
                        <p>✉️ <strong>Email:</strong> support@traveltour.vn &nbsp;|&nbsp; 🌐 <strong>Website:</strong> www.traveltour.vn</p>
                        <p>🏢 <strong>Mã số thuế:</strong> 0109888999</p>
                    </div>
                </div>

                <div class="invoice-title-block">
                    <h1 class="invoice-main-title">HÓA ĐƠN DỊCH VỤ</h1>
                    <div class="invoice-sub-title">TOUR SERVICE INVOICE</div>

                    <div class="invoice-quick-meta">
                        <div>Mã hóa đơn: <strong class="invoice-code-highlight">#${formattedInvoiceCode}</strong></div>
                        <div>Mã đặt tour: <strong>#${formattedBookingCode}</strong></div>
                        <div>Ngày lập phiếu: <span>${formatDateTime(data.invoiceDate)}</span></div>
                        <div>
                            <span class="invoice-status-badge ${statusClass}">
                                ${isPaid ? "✓" : "●"} ${statusLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- THÔNG TIN 2 CỘT: KHÁCH HÀNG & CHUYẾN ĐI -->
            <div class="invoice-info-grid">
                <!-- Cột 1: Khách hàng -->
                <div class="invoice-info-card">
                    <div class="card-heading">
                        <span>👤</span>
                        <span>Thông tin khách hàng</span>
                    </div>
                    <div class="info-rows">
                        <div class="info-row">
                            <span class="info-label">Họ và tên:</span>
                            <span class="info-value">${escapeHtml(data.customerName)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Số điện thoại:</span>
                            <span class="info-value">${escapeHtml(data.customerPhone)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${escapeHtml(data.customerEmail)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Địa chỉ liên hệ:</span>
                            <span class="info-value">${escapeHtml(data.customerAddress)}</span>
                        </div>
                    </div>
                </div>

                <!-- Cột 2: Đơn đặt & Thanh toán -->
                <div class="invoice-info-card">
                    <div class="card-heading">
                        <span>📋</span>
                        <span>Thông tin đặt tour & thanh toán</span>
                    </div>
                    <div class="info-rows">
                        <div class="info-row">
                            <span class="info-label">Ngày đặt tour:</span>
                            <span class="info-value">${formatDateTime(data.bookingDate)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Ngày khởi hành:</span>
                            <span class="info-value" style="color: #087db5; font-weight: 700;">${formatDate(data.departureDate)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phương thức:</span>
                            <span class="info-value">${escapeHtml(paymentMethodText)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Ngày thanh toán:</span>
                            <span class="info-value">${formatDateTime(data.paymentDate || data.invoiceDate)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- BẢNG CHI TIẾT DỊCH VỤ TOUR -->
            <div class="invoice-table-section">
                <div class="invoice-table-title">Chi tiết dịch vụ du lịch</div>
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;" class="col-center">STT</th>
                            <th>Tên chương trình Tour & Điểm đến</th>
                            <th style="width: 120px;" class="col-center">Thời lượng</th>
                            <th style="width: 150px;" class="col-right">Đơn giá / Khách</th>
                            <th style="width: 90px;" class="col-center">Số khách</th>
                            <th style="width: 160px;" class="col-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="col-center">1</td>
                            <td class="tour-title-cell">
                                <strong>${escapeHtml(data.tourName)}</strong>
                                <span>📍 Điểm đến: ${escapeHtml(data.destination)} &nbsp;|&nbsp; Khởi hành: ${formatDate(data.departureDate)}</span>
                            </td>
                            <td class="col-center">${data.duration} ngày ${Math.max(1, data.duration - 1)} đêm</td>
                            <td class="col-right">${formatPrice(unitPrice)}</td>
                            <td class="col-center"><strong>${numPeople}</strong></td>
                            <td class="col-right"><strong>${formatPrice(totalAmount)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- KHỐI TỔNG KẾT TÀI CHÍNH & TIỀN BẰNG CHỮ -->
            <div class="invoice-financial-section">
                <div class="invoice-words-block">
                    <strong>Số tiền viết bằng chữ:</strong>
                    <span class="invoice-words-text">${amountWords}</span>
                </div>

                <div class="invoice-calculation">
                    <div class="calc-row">
                        <span>Tiền dịch vụ tour:</span>
                        <span>${formatPrice(totalAmount)}</span>
                    </div>
                    <div class="calc-row">
                        <span>Thuế GTGT (VAT 0%):</span>
                        <span>Đã bao gồm</span>
                    </div>
                    <div class="calc-row">
                        <span>Phí xuất hóa đơn:</span>
                        <span>Miễn phí</span>
                    </div>
                    <div class="calc-row total-row">
                        <span>TỔNG THANH TOÁN:</span>
                        <span>${formatPrice(totalAmount)}</span>
                    </div>
                </div>
            </div>

            <!-- CON DẤU & CHỮ KÝ XÁC NHẬN -->
            <div class="invoice-bottom-section">
                <div class="invoice-signatures">
                    <!-- Bên khách hàng -->
                    <div class="signature-box">
                        <h4>KHÁCH HÀNG / NGƯỜI ĐẶT</h4>
                        <span>(Ký và ghi rõ họ tên)</span>
                        <div class="signature-name">${escapeHtml(data.customerName)}</div>
                    </div>

                    <!-- Bên công ty -->
                    <div class="signature-box">
                        <h4>ĐẠI DIỆN TRAVEL TOUR</h4>
                        <span>(Ký tên, đóng dấu xác nhận)</span>
                        ${isPaid ? `
                            <div class="paid-stamp">
                                ★ ĐÃ THANH TOÁN ★<br>
                                <small style="font-size: 10px; font-weight: normal; letter-spacing: 0;">${formatDate(data.paymentDate || data.invoiceDate)}</small>
                            </div>
                        ` : ""}
                        <div class="signature-name">Bộ phận Kế toán & Dịch vụ</div>
                    </div>
                </div>

                <!-- LƯU Ý VÀ HƯỚNG DẪN HÀNH TRÌNH -->
                <div class="invoice-footer-notes">
                    <p>📌 <strong>Lưu ý quan trọng:</strong> Quý khách vui lòng có mặt tại điểm đón trước <strong>30 phút</strong> so với giờ khởi hành và xuất trình hóa đơn này kèm theo CCCD/Hộ chiếu bản gốc.</p>
                    <p>Mọi thắc mắc về lịch trình, dịch vụ vui lòng liên hệ Tổng đài <strong>1900 6868</strong> để được hướng dẫn nhanh nhất.</p>
                    <p style="margin-top: 10px; font-style: italic; color: #087db5; font-weight: 600;">
                        Cảm ơn Quý khách đã tin tưởng đồng hành cùng Travel Tour! Chúc Quý khách có một hành trình trọn vẹn và ý nghĩa!
                    </p>
                </div>
            </div>
        `;

        // Đổi title tab trình duyệt theo hóa đơn
        document.title = `Hóa đơn ${formattedInvoiceCode} - Travel Tour`;

    } catch (error) {
        console.error("Lỗi tải thông tin hóa đơn:", error);
        invoiceSheet.innerHTML = `
            <div class="invoice-error">
                <h3>⚠️ Không thể tải thông tin hóa đơn</h3>
                <p>${escapeHtml(error.message || "Đã xảy ra lỗi trong quá trình kết nối đến máy chủ.")}</p>
                <div style="margin-top: 18px;">
                    <button type="button" class="btn-print-invoice" onclick="location.reload()">
                        🔄 Thử tải lại
                    </button>
                    <a href="tours.html" class="btn-toolbar-link" style="margin-left: 10px;">
                        Quay lại danh sách tour
                    </a>
                </div>
            </div>
        `;
    }
});