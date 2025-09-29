/**
 * Rodi-X Component Converter
 * Rodi-X 커스텀 컴포넌트를 표준 HTML로 변환
 *
 * 지원 컴포넌트:
 * - XButton, XInput, XLabel, XSpan, XDiv, XImage
 * - XTable, XRow, XCell
 * - XRadio, XCheckBox, XSlider
 * - XSelectBox, XOption
 * - XTableList, XPaginate
 */

class RodiConverter {
  constructor() {
    // Rodi-X 컴포넌트 → HTML 태그 매핑
    this.componentMap = {
      // 기본 컴포넌트
      'xtable': 'table',
      'xrow': 'tr',
      'xcell': 'td',
      'xinput': 'input',
      'xbutton': 'button',
      'xlabel': 'label',
      'xspan': 'span',
      'xdiv': 'div',
      'ximage': 'img',

      // 폼 컴포넌트 (특별 처리 필요)
      'xradio': 'input',
      'xcheckbox': 'input',
      'xslider': 'input',
      'xselectbox': 'select',
      'xoption': 'option',

      // 복합 컴포넌트
      'xtablelist': 'div',
      'xpaginate': 'div'
    };
  }

  /**
   * Rodi-X HTML을 표준 HTML로 변환
   * @param {string} htmlString - 변환할 Rodi-X HTML
   * @returns {string} 변환된 표준 HTML
   */
  convert(htmlString) {
    let result = htmlString;

    // === 1단계: 특별 처리가 필요한 컴포넌트들 ===

    // XButton - text 속성을 버튼 내용으로 변환
    result = result.replace(/<XButton([^>]*?)text="([^"]*)"([^>]*?)\/?>(?:<\/XButton>)?/gi,
      (match, attrs1, text, attrs2) => {
        const allAttrs = (attrs1 + attrs2).replace(/text="[^"]*"/g, '').trim();
        return `<button ${allAttrs}>${text}</button>`;
      }
    );

    // XRadio - label로 감싸고 type="radio" 추가
    result = result.replace(/<XRadio([^>]*?)>([^<]*?)<\/XRadio>/gi,
      (match, attrs, content) => {
        const convertedAttrs = this.convertAttributes(attrs);
        return `<label><input type="radio" ${convertedAttrs}> ${content}</label>`;
      }
    );

    // XCheckBox - label로 감싸고 type="checkbox" 추가
    result = result.replace(/<XCheckBox([^>]*?)>([^<]*?)<\/XCheckBox>/gi,
      (match, attrs, content) => {
        const convertedAttrs = this.convertAttributes(attrs);
        return `<label><input type="checkbox" ${convertedAttrs}> ${content}</label>`;
      }
    );

    // XSlider - type="range" 추가
    result = result.replace(/<XSlider([^>]*?)\/?>(?:<\/XSlider>)?/gi,
      (match, attrs) => {
        const convertedAttrs = this.convertAttributes(attrs);
        return `<input type="range" ${convertedAttrs}>`;
      }
    );

    // XSelectBox with XOption - label 속성 처리
    result = result.replace(/<XSelectBox([^>]*?)>(.*?)<\/XSelectBox>/gis,
      (match, attrs, content) => {
        const convertedAttrs = this.convertAttributes(attrs);
        const convertedContent = content.replace(/<XOption([^>]*?)\/?>(?:<\/XOption>)?/gi,
          (optMatch, optAttrs) => {
            // label 속성을 option 내용으로 변환
            const labelMatch = optAttrs.match(/label="([^"]*)"/i);
            const labelText = labelMatch ? labelMatch[1] : '';
            const cleanAttrs = optAttrs.replace(/label="[^"]*"/gi, '').trim();
            const optConvertedAttrs = this.convertAttributes(cleanAttrs);
            return `<option ${optConvertedAttrs}>${labelText}</option>`;
          }
        );
        return `<select ${convertedAttrs}>${convertedContent}</select>`;
      }
    );

    // === 2단계: 일반 컴포넌트 변환 ===
    Object.entries(this.componentMap).forEach(([rodiTag, htmlTag]) => {
      // 이미 특별 처리된 컴포넌트들 제외
      if (['xbutton', 'xradio', 'xcheckbox', 'xslider', 'xselectbox', 'xoption'].includes(rodiTag)) return;

      // 여는 태그 변환
      const openRegex = new RegExp(`<${rodiTag}([^>]*)>`, 'gi');
      result = result.replace(openRegex, (match, attrs) => {
        const convertedAttrs = this.convertAttributes(attrs);
        return `<${htmlTag}${convertedAttrs}>`;
      });

      // 닫는 태그 변환
      const closeRegex = new RegExp(`</${rodiTag}>`, 'gi');
      result = result.replace(closeRegex, `</${htmlTag}>`);
    });

    // === 3단계: HTML 정리 ===

    // 자체 닫는 input 태그 처리
    result = result.replace(/<input([^>]*)><\/input>/gi, '<input$1>');

    // 테이블 내 버튼을 td로 감싸기 (레이아웃 개선)
    result = result.replace(/<tr([^>]*)>\s*<button([^>]*)>(.*?)<\/button>\s*<\/tr>/gi,
      '<tr$1><td colspan="2" style="text-align: center; padding: 4px;"><button$2>$3</button></td></tr>'
    );

    // 속성명 변환
    result = result.replace(/className=/gi, 'class=');
    result = result.replace(/isColumnHeader="true"/gi, 'data-column-header="true"');

    // === 4단계: CSS 스타일 추가 ===
    result = this.addStyles(result);

    return result;
  }

  convertAttributes(attrString) {
    if (!attrString) return '';

    return attrString
      .replace(/className=/gi, 'class=')
      .replace(/isColumnHeader=/gi, 'data-column-header=')
      .replace(/isHeader=/gi, 'data-header=')
      .replace(/htmlFor=/gi, 'for=')
      .replace(/searchMode=/gi, 'data-search-mode=')
      .replace(/useAddButton=/gi, 'data-use-add-button=')
      .replace(/useDeleteButton=/gi, 'data-use-delete-button=')
      .replace(/selected/gi, 'selected="selected"');
  }

  addStyles(html) {
    const styles = `
<style>
/* 기본 테이블 스타일 */
table {
  border-collapse: collapse;
  width: 100%;
  font-family: Arial, sans-serif;
}

tr {
  display: table-row;
}

td {
  display: table-cell;
  border: 1px solid #ddd;
  padding: 4px;
  vertical-align: middle;
}

td[data-column-header="true"] {
  background-color: #f5f5f5;
  font-weight: bold;
  text-align: left;
  padding-left: 10px;
}

/* 버튼 스타일 */
button {
  background: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

button:hover {
  background: #0056b3;
}

/* 테이블 안의 버튼 특별 스타일 */
td > button {
  width: 70%;
  margin: 0 auto;
  height: 30px;
  display: block;
}

/* Input 스타일 */
input {
  border: 1px solid #ccc;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  box-sizing: border-box;
}

input:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

/* Radio & Checkbox 스타일 */
input[type="radio"], input[type="checkbox"] {
  margin-right: 8px;
  width: auto;
  padding: 0;
}

label {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  cursor: pointer;
}

/* Slider 스타일 */
input[type="range"] {
  width: 200px;
  height: 6px;
  background: #ddd;
  outline: none;
  border-radius: 3px;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: #007bff;
  cursor: pointer;
  border-radius: 50%;
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #007bff;
  cursor: pointer;
  border-radius: 50%;
  border: none;
}

/* Select 스타일 */
select {
  border: 1px solid #ccc;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  min-width: 150px;
}

select:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

/* PID 게인 특화 스타일 */
.PID-gain-container {
  position: relative;
  height: 100%;
}

.PID-gain-box {
  position: relative;
  display: flex;
  box-sizing: border-box;
}

.PID-gain-table-box {
  flex: 0 0 38%;
}

.PID-gain-table-child {
  display: table;
  width: 142px;
  border: 0;
  padding: 0;
}

.PID-gain-table-row {
  display: table-row;
  min-height: 1px;
}

.PID-gain-th {
  font-size: 11px;
  font-weight: bold;
  padding: 4px 0px 4px 10px;
  line-height: 1em;
  display: table-cell;
  vertical-align: middle;
  flex: 0 0 38%;
}

.PID-gain-td {
  font-size: 12px;
  padding: 4px 0px;
  display: table-cell;
  vertical-align: middle;
  flex: 0 0 75%;
}

.input-custom {
  width: 68px;
  height: 20px;
}

.PID-gain-table-btn {
  width: 70% !important;
  margin: 0 auto !important;
  height: 30px !important;
  line-height: 30px !important;
  display: block !important;
}

.PID-gain-cell {
  padding: 0;
}
</style>
`;

    if (html.includes('<head>')) {
      return html.replace('</head>', `${styles}</head>`);
    } else {
      return styles + html;
    }
  }
}

module.exports = RodiConverter;