// public/app.js
(async function () {
  // Dùng đường dẫn tương đối để tránh CORS và đổi domain
  const API_URL = "/members";

  async function loadMembers() {
    const list = document.getElementById("members-list");
    if (!list) {
      console.error("Không thấy phần tử #members-list trong HTML");
      return;
    }

    // Trạng thái đang tải
    list.innerHTML = "<li>Đang tải danh sách...</li>";

    try {
      const res = await fetch(API_URL, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Fetch ${API_URL} lỗi: HTTP ${res.status}`);
      }

      const json = await res.json();

      // API của bạn trả về { data: [...], paging: {...} }
      const data = Array.isArray(json?.data) ? json.data : [];

      list.innerHTML = "";
      if (data.length === 0) {
        list.innerHTML = "<li>Chưa có đảng viên nào.</li>";
        return;
      }

      data.forEach((m) => {
        const li = document.createElement("li");
        li.textContent = `${m.name} — ${m.email}`;
        list.appendChild(li);
      });
    } catch (err) {
      console.error("Lỗi khi tải danh sách:", err);
      list.innerHTML =
        "<li style='color:red'>Không tải được danh sách. Mở F12 → Console để xem lỗi chi tiết.</li>";
    }
  }

  // Chờ DOM sẵn sàng rồi mới gọi
  window.addEventListener("DOMContentLoaded", loadMembers);
})();
