# 🎨 Grayscale & Revert - Figma Plugin

<div align="center">
  <img src="avatar.png" alt="Grayscale & Revert Avatar" width="160" style="border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
  
  <br />

  [![Figma Plugin](https://img.shields.io/badge/Figma-Plugin-F24E1E?logo=figma&logoColor=white)](https://www.figma.com/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
</div>

---

## 📌 Giới thiệu (About)

**Grayscale & Revert** là một plugin mạnh mẽ và mượt mà dành cho Figma, giúp các UI/UX Designer nhanh chóng chuyển đổi giao diện, thành phần thiết kế, hình ảnh và gradient sang chế độ đen trắng (Grayscale) chuẩn độ sáng mắt người (BT.709 sRGB Luminance). 

Đặc biệt, plugin hỗ trợ tính năng **Revert (Khôi phục)** hoàn hảo 100% màu sắc nguyên bản bất kỳ lúc nào nhờ cơ chế lưu trữ dữ liệu an toàn trực tiếp vào `pluginData` của từng node trong Figma.

---

## ✨ Tính năng nổi bật (Features)

- 🌗 **Chuyển đổi Grayscale chính xác (BT.709 Standard):** Tính toán độ sáng thực tế theo công thức chuẩn sRGB:
  $$Y = 0.2126 \times R + 0.7152 \times G + 0.0722 \times B$$
- 🔄 **Khôi phục màu gốc 100% (Lossless Revert):** Lưu trữ thuộc tính màu nguyên bản vào `pluginData` của node. Khôi phục lại màu ban đầu chỉ với 1 click.
- 🖼 **Hỗ trợ đầy đủ các loại Element:**
  - Solid Fills & Text Fills (kể cả Text chứa nhiều màu sắc khác nhau - Mixed fills).
  - Tất cả các loại Gradient (Linear, Radial, Angular, Diamond).
  - Strokes (Đường viền) & Shadow Effects (Inner/Drop Shadow).
  - Hình ảnh (Image fills) với bộ lọc Saturation tự động.
- ⚡ **Thao tác nhanh từ Quick Menu:** Có sẵn menu lệnh trực tiếp trong Figma mà không bắt buộc phải luôn mở bảng điều khiển (UI Panel).
- 💎 **Giao diện hiện đại (Modern Glassmorphism UI):** Thiết kế bảng điều khiển tối ưu, tự động tương thích với Dark/Light theme của Figma.

---

## 📁 Cấu trúc dự án (Project Structure)

```text
Grayscale plugin figma/
├── manifest.json                  # Cấu hình plugin Figma (Manifest v2)
├── code.js                        # Logic xử lý backend sandbox của Figma Plugin
├── ui.html                        # Giao diện người dùng (HTML/CSS/JS)
├── case_study_process_chart.html  # Sơ đồ quy trình làm việc & Case study
├── avatar.png                     # Ảnh Đại diện / Logo của plugin (AI Generated)
├── icon.png                       # Icon chuẩn 128x128 cho Figma Plugin
└── README.md                      # Tài liệu hướng dẫn sử dụng
```

---

## 🚀 Hướng dẫn cài đặt vào Figma (Installation)

1. **Clone dự án về máy:**
   ```bash
   git clone https://github.com/quendinao/grayscale-plugin-figma.git
   ```

2. **Mở ứng dụng Figma Desktop App:**
   - Vào menu: `Plugins` -> `Development` -> `Import plugin from manifest...`
   - Chọn file `manifest.json` trong thư mục dự án vừa clone.

3. **Sử dụng Plugin:**
   - Chuột phải vào canvas hoặc đối tượng chọn trong Figma -> `Plugins` -> `Development` -> `Grayscale & Revert`.

---

## 🛠 Hướng dẫn sử dụng (Usage)

| Lệnh (Command) | Mô tả |
| :--- | :--- |
| **Open Plugin Panel** | Mở bảng điều khiển giao diện đầy đủ tính năng & thống kê. |
| **Convert Selection to Grayscale** | Chuyển trực tiếp tất cả các layer đang chọn sang màu đen trắng. |
| **Revert Selection Colors** | Khôi phục lại màu sắc ban đầu của các layer đang chọn. |

---

## 🧠 Cơ chế kỹ thuật (Technical Details)

1. **State Preservation (Bảo toàn trạng thái):**
   Khi thực hiện Grayscale, plugin mã hóa trạng thái màu sắc ban đầu thành chuỗi JSON và ghi vào `node.setPluginData("original-colors", JSON.stringify(data))`. Khi cần Revert, plugin khôi phục chính xác từng mảng Fill, Stroke và Effect.

2. **Mixed Text Handling (Xử lý Text đa màu):**
   Xử lý đặc biệt đối với các khung văn bản có nhiều dải màu (Text Range Fills) để đảm bảo không bị mất style chữ hoặc màu sắc của từng ký tự khi chuyển đổi và khôi phục.

---

## 📜 Giấy phép (License)

Dự án được phân phối dưới giấy phép [MIT License](LICENSE).
