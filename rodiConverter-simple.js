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
      'xparagraph': 'p',
      'xheading': 'h3',
      'xlink': 'a',

      // 폼 컴포넌트 (특별 처리 필요)
      'xradio': 'input',
      'xcheckbox': 'input',
      'xslider': 'input',
      'xselectbox': 'select',
      'xoption': 'option',
      'xtextarea': 'textarea',

      // 복합 컴포넌트
      'xtablelist': 'div',
      'xpaginate': 'div',
      'xcontainer': 'div',
      'xsection': 'section'
    };

    // 변환 통계
    this.stats = {
      totalConversions: 0,
      componentCounts: {},
      errors: []
    };
  }

  /**
   * Rodi-X HTML을 표준 HTML로 변환
   * @param {string} htmlString - 변환할 Rodi-X HTML
   * @returns {string} 변환된 표준 HTML
   */
  convert(htmlString) {
    this.stats.totalConversions++;
    this.stats.errors = [];
    let result = htmlString;

    try {

    // === 1단계: 특별 처리가 필요한 컴포넌트들 ===

    // XButton - text 속성을 버튼 내용으로 변환, V3와 동일한 클래스 구조 생성
    result = result.replace(/<XButton([^>]*?)text="([^"]*)"([^>]*?)\/?>(?:<\/XButton>)?/gi,
      (match, attrs1, text, attrs2) => {
        const allAttrs = (attrs1 + attrs2).trim();

        // type, visible, className, size 속성 추출
        const typeMatch = allAttrs.match(/type="([^"]*)"/i);
        const visibleMatch = allAttrs.match(/visible="([^"]*)"/i);
        const classMatch = allAttrs.match(/className="([^"]*)"/i);
        const sizeMatch = allAttrs.match(/size="([^"]*)"/i);

        const type = typeMatch ? typeMatch[1] : 'default';
        const visible = visibleMatch ? visibleMatch[1] : 'true';
        const userClass = classMatch ? classMatch[1] : '';
        const size = sizeMatch ? sizeMatch[1] : '';

        // V3와 동일한 클래스 조합: btn + type + size + userClass + visible-show/hide
        let classes = ['btn'];

        // type 클래스 추가
        if (type && type !== 'default') {
          classes.push(type);
        } else {
          classes.push('default');
        }

        // size 클래스 추가
        if (size === 'small') {
          classes.push('small');
        } else if (size === 'middle' || size === 'default') {
          // middle은 기본이므로 추가 클래스 없음
        }

        // visible 클래스 추가 - xbutton 접두사로 컴포넌트별 스타일 적용
        if (visible === 'false') {
          classes.push('xbutton-visible-hide');
        } else {
          classes.push('xbutton-visible-show');
        }

        // 사용자 정의 클래스 추가
        if (userClass) {
          classes.push(userClass);
        }

        // 나머지 속성 변환 (type, visible, className, text 제외)
        let remainingAttrs = allAttrs
          .replace(/type="[^"]*"/gi, '')
          .replace(/visible="[^"]*"/gi, '')
          .replace(/className="[^"]*"/gi, '')
          .replace(/text="[^"]*"/gi, '')
          .trim();

        // data-visible 속성 추가 (JS에서 사용)
        remainingAttrs += ` data-visible="${visible}"`;

        const convertedAttrs = this.convertAttributes(remainingAttrs);
        const classAttr = `class="${classes.join(' ')}"`;

        return `<button ${classAttr} ${convertedAttrs}>${text}</button>`;
      }
    );

    // XRadio - V3와 동일한 구조로 변환
    result = result.replace(/<XRadio([^>]*?)>([^<]*?)<\/XRadio>/gi,
      (match, attrs, content) => {
        const convertedAttrs = this.convertAttributes(attrs);
        return `<label class="radio-wrapper"><input type="radio" class="hide-input" ${convertedAttrs}><span class="ico-radio"></span><span class="txt">${content}</span></label>`;
      }
    );

    // XCheckBox - V3와 동일한 구조로 변환
    result = result.replace(/<XCheckBox([^>]*?)>([^<]*?)<\/XCheckBox>/gi,
      (match, attrs, content) => {
        const convertedAttrs = this.convertAttributes(attrs);
        return `<label class="checkbox-wrapper"><input type="checkbox" class="hide-input" ${convertedAttrs}><span class="ico-checkbox"></span><span class="txt">${content}</span></label>`;
      }
    );

    // XSlider - type="range" 추가
    result = result.replace(/<XSlider([^>]*?)\/?>(?:<\/XSlider>)?/gi,
      (match, attrs) => {
        const convertedAttrs = this.convertAttributes(attrs);
        return `<input type="range" ${convertedAttrs}>`;
      }
    );

    // XInput - visible 속성 처리
    result = result.replace(/<XInput([^>]*?)\/?>(?:<\/XInput>)?/gi,
      (match, attrs) => {
        // visible 속성 추출
        const visibleMatch = attrs.match(/visible="([^"]*)"/i);
        const visible = visibleMatch ? visibleMatch[1] : 'true';

        // className 추출
        const classMatch = attrs.match(/className="([^"]*)"/i);
        const userClass = classMatch ? classMatch[1] : '';

        // V3 스타일 클래스 조합: input + visible + userClass
        let classes = ['input'];  // Input.scss의 기본 클래스
        if (userClass) classes.push(userClass);
        if (visible === 'false') {
          classes.push('xinput-visible-hide');
        } else {
          classes.push('xinput-visible-show');
        }

        // 나머지 속성 변환 (visible, className 제외)
        let remainingAttrs = attrs
          .replace(/visible="[^"]*"/gi, '')
          .replace(/className="[^"]*"/gi, '')
          .trim();

        // data-visible 속성 추가
        remainingAttrs += ` data-visible="${visible}"`;

        const convertedAttrs = this.convertAttributes(remainingAttrs);
        const classAttr = `class="${classes.join(' ')}"`;

        return `<input ${classAttr} ${convertedAttrs}>`;
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
      if (['xbutton', 'xradio', 'xcheckbox', 'xslider', 'xinput', 'xselectbox', 'xoption'].includes(rodiTag)) return;

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

    } catch (error) {
      this.stats.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.error('❌ 변환 중 오류 발생:', error);
      throw error;
    }

    return result;
  }

  /**
   * 변환 통계 반환
   * @returns {object} 변환 통계 정보
   */
  getStats() {
    return {
      ...this.stats,
      componentCounts: Object.keys(this.componentMap).reduce((acc, key) => {
        acc[key] = (acc[key] || 0);
        return acc;
      }, {})
    };
  }

  /**
   * 통계 초기화
   */
  resetStats() {
    this.stats = {
      totalConversions: 0,
      componentCounts: {},
      errors: []
    };
  }

  convertAttributes(attrString) {
    if (!attrString) return '';

    let result = attrString
      .replace(/className=/gi, 'class=')
      .replace(/isColumnHeader=/gi, 'data-column-header=')
      .replace(/isHeader=/gi, 'data-header=')
      .replace(/htmlFor=/gi, 'for=')
      .replace(/searchMode=/gi, 'data-search-mode=')
      .replace(/useAddButton=/gi, 'data-use-add-button=')
      .replace(/useDeleteButton=/gi, 'data-use-delete-button=')
      .replace(/selected/gi, 'selected="selected"');

    // XButton의 type 속성을 class로 변환 (type="primary" -> class="btn primary")
    const typeMatch = result.match(/type="([^"]*)"/i);
    if (typeMatch) {
      const typeValue = typeMatch[1];
      // type 속성 제거
      result = result.replace(/type="[^"]*"/gi, '');

      // 기존 class 속성이 있으면 추가, 없으면 생성
      const classMatch = result.match(/class="([^"]*)"/i);
      if (classMatch) {
        // 기존 class에 btn과 type 값 추가
        const existingClasses = classMatch[1];
        result = result.replace(/class="[^"]*"/i, `class="btn ${typeValue} ${existingClasses}"`);
      } else {
        // class 속성 새로 생성
        result = `class="btn ${typeValue}" ${result}`;
      }
    }

    return result;
  }

  addStyles(html) {
    // V3 프로젝트 스타일을 server.js에서 로드하므로 폴백 스타일 제거
    // PID 게인 관련 레이아웃 스타일만 유지
    const styles = `
<style>
/* 레이아웃 헬퍼 스타일 - V3 스타일에 영향 없음 */

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