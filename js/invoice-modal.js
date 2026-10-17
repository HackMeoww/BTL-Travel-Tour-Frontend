/**
 * invoice-modal.js - Hiển thị và in hóa đơn du lịch A4 trực tiếp dạng Modal Popup
 * Tuyệt đối không mở website/tab mới, giữ nguyên trang hiện tại của người dùng.
 */

(function () {
    // Tiện ích định dạng dữ liệu
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

    // Đảm bảo phần tử Modal tồn tại trong DOM
    function ensureModalElements() {
        let overlay = document.getElementById("invoiceModalOverlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "invoiceModalOverlay";
            overlay.className = "invoice-modal-overlay";
            overlay.style.display = "none";
            overlay.innerHTML = `
                <div class="invoice-modal-container" id="invoiceModalContainer" role="dialog" aria-modal="true">
                    <div class="invoice-modal-toolbar no-print">
                        <div class="invoice-modal-title">
                            <span class="invoice-modal-badge">HÓA ĐƠN ĐIỆN TỬ</span>
                            <span class="invoice-modal-code" id="invoiceModalCode">Đang tải...</span>
                        </div>
                        <div class="invoice-modal-actions">
                            <button type="button" class="btn-invoice-action btn-invoice-print" id="invoiceModalPrintBtn">
                                🖨️ In hóa đơn / Lưu PDF
                            </button>
                            <button type="button" class="btn-invoice-action btn-invoice-close" id="invoiceModalCloseBtn" title="Đóng (Esc)">
                                ✕ Đóng
                            </button>
                        </div>
                    </div>
                    <div class="invoice-modal-body">
                        <div class="invoice-sheet" id="invoiceModalSheet">
                            <div class="invoice-loading">
                                <div class="invoice-spinner"></div>
                                <p>Đang tải thông tin hóa đơn chi tiết...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Gán sự kiện đóng modal
            const closeBtn = document.getElementById("invoiceModalCloseBtn");
            if (closeBtn) {
                closeBtn.addEventListener("click", closeInvoiceModal);
            }

            // Click vào vùng mờ (backdrop) bên ngoài để đóng modal
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) {
                    closeInvoiceModal();
                }
            });

            // Bấm phím Escape để đóng modal
            document.addEventListener("keydown", function (e) {
                if (e.key === "Escape" && overlay.style.display !== "none") {
                    closeInvoiceModal();
                }
            });
        }
        return overlay;
    }

    // In nội dung hóa đơn thông qua iframe ẩn (không mở tab/website mới)
    function printInvoiceContent(contentHtml) {
        let printFrame = document.getElementById("invoicePrintHiddenIframe");
        if (!printFrame) {
            printFrame = document.createElement("iframe");
            printFrame.id = "invoicePrintHiddenIframe";
            printFrame.style.position = "fixed";
            printFrame.style.right = "-9999px";
            printFrame.style.bottom = "-9999px";
            printFrame.style.width = "0";
            printFrame.style.height = "0";
            printFrame.style.border = "none";
            document.body.appendChild(printFrame);
        }

        const frameDoc = printFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <title>Hóa đơn - Travel Tour</title>
                <link rel="stylesheet" href="../css/style.css">
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 10mm 12mm;
                    }
                    *, *::before, *::after {
                        box-shadow: none !important;
                        text-shadow: none !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                        font-size: 11pt !important;
                        line-height: 1.4 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .invoice-sheet {
                        border: none !important;
                        border-radius: 0 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    .invoice-table th {
                        background-color: #f1f5f9 !important;
                        color: #000000 !important;
                    }
                    .invoice-info-card {
                        background-color: #f8fafc !important;
                        border: 1px solid #cbd5e1 !important;
                    }
                </style>
            </head>
            <body>
                <div class="invoice-sheet">
                    ${contentHtml}
                </div>
            </body>
            </html>
        `);
        frameDoc.close();

        // Chờ nạp CSS rồi gọi lệnh in trực tiếp
        setTimeout(() => {
            try {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            } catch (err) {
                console.error("Lỗi khi gọi hộp thoại in:", err);
                // Fallback: gọi in của trang hiện tại
                window.print();
            }
        }, 400);
    }

    // Tải dữ liệu hóa đơn đầy đủ từ Backend (có cơ chế Fallback nếu endpoint chi tiết chưa sẵn sàng)
    async function fetchFullInvoiceData({ invoiceId, bookingId, token }) {
        const authHeaders = {
            "Authorization": `Bearer ${token}`
        };

        const baseUrl = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "https://localhost:7032/api";

        let finalInvoiceId = invoiceId;
        const effectiveBookingId = bookingId;

        // Nếu có bookingId mà chưa có invoiceId, tìm trong danh sách hóa đơn
        if (!finalInvoiceId && effectiveBookingId) {
            try {
                const listRes = await fetch(`${baseUrl}/Invoice`, { headers: authHeaders });
                if (listRes.ok) {
                    const list = await listRes.json();
                    if (Array.isArray(list)) {
                        const matched = list.find(item => Number(item.bookingId) === Number(effectiveBookingId));
                        if (matched && matched.invoiceId) {
                            finalInvoiceId = matched.invoiceId;
                        }
                    }
                }
            } catch (err) {
                console.warn("Không thể tìm hóa đơn theo mã đặt tour:", err);
            }
        }

        // Bước 1: Thử gọi API chi tiết hóa đơn (/Invoice/{id}/detail)
        if (finalInvoiceId) {
            try {
                const detailRes = await fetch(`${baseUrl}/Invoice/${finalInvoiceId}/detail`, {
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
        let actualBookingId = effectiveBookingId;

        if (finalInvoiceId) {
            try {
                const invoiceRes = await fetch(`${baseUrl}/Invoice/${finalInvoiceId}`, {
                    headers: authHeaders
                });
                if (invoiceRes.ok) {
                    invoice = await invoiceRes.json();
                    actualBookingId = invoice.bookingId || actualBookingId;
                }
            } catch (e) {
                console.warn("Không tải được invoice độc lập:", e);
            }
        }

        let booking = null;
        let tour = null;
        let customer = null;
        let payment = null;

        if (actualBookingId) {
            try {
                const bookingRes = await fetch(`${baseUrl}/Booking/${actualBookingId}`, {
                    headers: authHeaders
                });
                if (bookingRes.ok) {
                    booking = await bookingRes.json();
                }

                // Tải thông tin Payment để lấy phương thức thanh toán
                const paymentRes = await fetch(`${baseUrl}/Payment`, {
                    headers: authHeaders
                }).catch(() => null);

                if (paymentRes && paymentRes.ok) {
                    const payments = await paymentRes.json();
                    if (Array.isArray(payments)) {
                        payment = payments.find(p => Number(p.bookingId) === Number(actualBookingId));
                    }
                }
            } catch (err) {
                console.warn("Lỗi tải thông tin booking/payment:", err);
            }
        }

        // Lấy thông tin Tour
        const tourIdToFetch = booking?.tourId;
        if (tourIdToFetch) {
            try {
                const tourRes = await fetch(`${baseUrl}/Tour/${tourIdToFetch}`);
                if (tourRes.ok) {
                    tour = await tourRes.json();
                }
            } catch (err) {
                console.warn("Lỗi tải thông tin tour:", err);
            }
        }

        // Lấy thông tin Khách hàng
        const customerIdToFetch = booking?.customerId;
        if (customerIdToFetch) {
            try {
                const customerRes = await fetch(`${baseUrl}/Customer/${customerIdToFetch}`, {
                    headers: authHeaders
                });
                if (customerRes.ok) {
                    customer = await customerRes.json();
                }
            } catch (err) {
                console.warn("Lỗi tải thông tin khách hàng:", err);
            }
        }

        const fallbackAmount = invoice?.amount || booking?.totalPrice || 0;

        return {
            invoiceId: invoice?.invoiceId || (actualBookingId ? `BK-${actualBookingId}` : "001"),
            invoiceDate: invoice?.invoiceDate || booking?.bookingDate || new Date().toISOString(),
            amount: fallbackAmount,
            paymentStatus: invoice?.paymentStatus || (booking?.status === "Confirmed" ? "Paid" : "Pending"),

            bookingId: booking?.bookingId || actualBookingId || 0,
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

    // Sinh HTML tờ hóa đơn chuẩn A4
    function renderInvoiceSheetHtml(data) {
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

        return `
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

            <!-- THÔNG TIN 2 BÊN -->
            <div class="invoice-info-grid">
                <div class="invoice-info-card">
                    <div class="card-badge">ĐƠN VỊ CUNG CẤP DỊCH VỤ</div>
                    <h3 class="card-title">CÔNG TY DU LỊCH TRAVEL TOUR</h3>
                    <div class="card-row">
                        <span class="label">Người đại diện:</span>
                        <span class="val">Ông Nguyễn Văn An - Giám đốc Lữ hành</span>
                    </div>
                    <div class="card-row">
                        <span class="label">Tài khoản thụ hưởng:</span>
                        <span class="val">1903 8888 9999 01 - Techcombank CN Hà Nội</span>
                    </div>
                    <div class="card-row">
                        <span class="label">Bộ phận CSKH:</span>
                        <span class="val">cskh@traveltour.vn - Ext: 102</span>
                    </div>
                </div>

                <div class="invoice-info-card">
                    <div class="card-badge">THÔNG TIN KHÁCH HÀNG / NGƯỜI ĐẶT</div>
                    <h3 class="card-title">${escapeHtml(data.customerName)}</h3>
                    <div class="card-row">
                        <span class="label">Số điện thoại:</span>
                        <span class="val"><strong>${escapeHtml(data.customerPhone)}</strong></span>
                    </div>
                    <div class="card-row">
                        <span class="label">Email liên hệ:</span>
                        <span class="val">${escapeHtml(data.customerEmail)}</span>
                    </div>
                    <div class="card-row">
                        <span class="label">Địa chỉ:</span>
                        <span class="val">${escapeHtml(data.customerAddress)}</span>
                    </div>
                </div>
            </div>

            <!-- THÔNG TIN THANH TOÁN & LỊCH TRÌNH NHANH -->
            <div class="invoice-meta-bar">
                <div class="meta-item">
                    <span class="meta-label">Phương thức thanh toán</span>
                    <span class="meta-value">${escapeHtml(paymentMethodText)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Thời gian thanh toán</span>
                    <span class="meta-value">${formatDateTime(data.paymentDate || data.invoiceDate)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Ngày khởi hành dự kiến</span>
                    <span class="meta-value highlight">${formatDate(data.departureDate)}</span>
                </div>
            </div>

            <!-- BẢNG CHI TIẾT DỊCH VỤ TOUR -->
            <div class="invoice-table-container">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th style="width: 45px; text-align: center;">STT</th>
                            <th>Nội dung dịch vụ & Chương trình tour</th>
                            <th style="width: 110px; text-align: center;">Thời lượng</th>
                            <th style="width: 130px; text-align: right;">Đơn giá</th>
                            <th style="width: 90px; text-align: center;">Số lượng</th>
                            <th style="width: 140px; text-align: right;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="text-align: center; font-weight: 600;">01</td>
                            <td>
                                <div class="item-tour-name">${escapeHtml(data.tourName)}</div>
                                <div class="item-tour-sub">
                                    <span>📍 Điểm đến: <strong>${escapeHtml(data.destination)}</strong></span>
                                    <span>🗓️ Ngày khởi hành: <strong>${formatDate(data.departureDate)}</strong></span>
                                </div>
                                <div class="item-tour-includes">
                                    ✓ Đã bao gồm: Xe đưa đón, khách sạn lưu trú, vé tham quan, bảo hiểm du lịch & HDV suốt tuyến.
                                </div>
                            </td>
                            <td style="text-align: center;">${escapeHtml(data.duration)} ngày</td>
                            <td style="text-align: right;">${formatPrice(unitPrice)}</td>
                            <td style="text-align: center; font-weight: 700;">${numPeople} khách</td>
                            <td style="text-align: right; font-weight: 700; color: #087db5;">${formatPrice(totalAmount)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- TỔNG KẾT TÀI CHÍNH & SỐ TIỀN BẰNG CHỮ -->
            <div class="invoice-financial-section">
                <div class="invoice-words-box">
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
                    <div class="signature-box">
                        <h4>KHÁCH HÀNG / NGƯỜI ĐẶT</h4>
                        <span>(Ký và ghi rõ họ tên)</span>
                        <div class="signature-name">${escapeHtml(data.customerName)}</div>
                    </div>

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
                    <p>Mọi thắc mắc về lịch trình, dịch vụ vui lòng liên hệ Tổng đài <strong>1900 6868</strong> để được hỗ trợ nhanh nhất.</p>
                    <p style="margin-top: 10px; font-style: italic; color: #087db5; font-weight: 600;">
                        Cảm ơn Quý khách đã tin tưởng đồng hành cùng Travel Tour! Chúc Quý khách có một hành trình trọn vẹn và ý nghĩa!
                    </p>
                </div>
            </div>
        `;
    }

    // ==========================================
    // HÀM TOÀN CỤC: MỞ MODAL XEM VÀ IN HÓA ĐƠN
    // ==========================================
    window.openInvoiceModal = async function ({ bookingId, invoiceId, autoPrint = false } = {}) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Bạn cần đăng nhập để xem và in hóa đơn.");
            return;
        }

        const overlay = ensureModalElements();
        const sheet = document.getElementById("invoiceModalSheet");
        const codeElement = document.getElementById("invoiceModalCode");
        const printBtn = document.getElementById("invoiceModalPrintBtn");

        // Hiển thị modal và khóa cuộn trang nền
        overlay.style.display = "flex";
        document.body.classList.add("invoice-modal-open");

        // Đặt trạng thái đang tải
        sheet.innerHTML = `
            <div class="invoice-loading">
                <div class="invoice-spinner"></div>
                <p>Đang tải thông tin hóa đơn chi tiết...</p>
            </div>
        `;
        codeElement.textContent = "Đang tải...";
        printBtn.disabled = true;

        try {
            const data = await fetchFullInvoiceData({ invoiceId, bookingId, token });

            const sheetHtml = renderInvoiceSheetHtml(data);
            sheet.innerHTML = sheetHtml;

            const rawId = String(data.invoiceId);
            const invoiceCode = rawId.startsWith("BK-") ? rawId : "HD-" + rawId.padStart(6, "0");
            codeElement.textContent = "#" + invoiceCode;
            printBtn.disabled = false;

            // Gán sự kiện cho nút In
            printBtn.onclick = function () {
                printInvoiceContent(sheet.innerHTML);
            };

            // Nếu yêu cầu tự động mở hộp thoại in
            if (autoPrint) {
                setTimeout(() => {
                    printInvoiceContent(sheet.innerHTML);
                }, 300);
            }

        } catch (error) {
            console.error("Lỗi khi tải hóa đơn:", error);
            sheet.innerHTML = `
                <div class="invoice-error">
                    <h3>⚠️ Không thể tải thông tin hóa đơn</h3>
                    <p>${escapeHtml(error.message || "Đã xảy ra lỗi khi kết nối máy chủ.")}</p>
                    <div style="margin-top: 18px;">
                        <button type="button" class="btn-invoice-action btn-invoice-print" onclick="openInvoiceModal({ bookingId: ${bookingId || null}, invoiceId: ${invoiceId || null} })">
                            🔄 Thử tải lại
                        </button>
                        <button type="button" class="btn-invoice-action btn-invoice-close" onclick="closeInvoiceModal()" style="margin-left: 10px;">
                            ✕ Đóng
                        </button>
                    </div>
                </div>
            `;
            codeElement.textContent = "Lỗi tải";
            printBtn.disabled = true;
        }
    };

    // ==========================================
    // HÀM TOÀN CỤC: ĐÓNG MODAL
    // ==========================================
    window.closeInvoiceModal = function () {
        const overlay = document.getElementById("invoiceModalOverlay");
        if (overlay) {
            overlay.style.display = "none";
        }
        document.body.classList.remove("invoice-modal-open");
    };

})();
