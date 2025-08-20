// app.js - quản lý hiển thị danh sách đảng viên

const API_URL = "https://dangvien-app.onrender.com/members";

// Lấy danh sách đảng viên và hiển thị ra giao diện
async function loadMembers() {
    const res = await fetch(API_URL);
    const data = await res.json();

    const list = document.getElementById("members-list");
    list.innerHTML = "";

    data.data.forEach(member => {
        const li = document.createElement("li");
        li.textContent = `${member.name} - ${member.email}`;
        list.appendChild(li);
    });
}

// Khi trang load xong thì gọi API
window.onload = loadMembers;
