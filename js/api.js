const API_BASE_URL = "https://localhost:7032/api";

// Lấy danh sách tất cả tour
async function getTours() {
    const response = await fetch(`${API_BASE_URL}/Tour`);

    if (!response.ok) {
        throw new Error("Không thể lấy danh sách tour");
    }

    return await response.json();
}