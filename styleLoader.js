/**
 * RodiX 컴포넌트 스타일 로더
 *
 * V3 프로젝트의 실제 SCSS 파일을 읽어와서
 * sass 컴파일러로 CSS로 변환한 후 프리뷰 서버에 적용합니다.
 */

const fs = require('fs');
const path = require('path');
const sass = require('sass');
const config = require('./config');

class StyleLoader {
  constructor() {
    this.loadedStyles = new Map();
    this.lastModified = new Map();
  }

  /**
   * 모든 컴포넌트 스타일 로드 (Global + Atoms + RodiX)
   */
  loadAllStyles() {
    const styles = [];
    const errors = [];
    let globalLoaded = 0;
    let atomsLoaded = 0;
    let rodixLoaded = 0;

    // 0. 전역 스타일 먼저 로드 (reset, base 등)
    console.log('\n📦 전역 스타일 로딩 중...');
    for (const [styleName, stylePath] of Object.entries(config.GLOBAL_STYLES)) {
      try {
        const style = this.loadComponentStyle(styleName, stylePath);
        if (style) {
          styles.push(style);
          globalLoaded++;
          console.log(`  ✅ ${styleName}: ${path.basename(stylePath)}`);
        }
      } catch (error) {
        errors.push({ componentName: styleName, error: error.message });
        console.warn(`  ⚠️  ${styleName}: ${error.message}`);
      }
    }

    // 1. Atoms 컴포넌트 스타일 로드 (기본 UI 컴포넌트)
    console.log('\n📦 Atoms 컴포넌트 스타일 로딩 중...');
    for (const [componentName, stylePath] of Object.entries(config.ATOMS_STYLES)) {
      try {
        const style = this.loadComponentStyle(componentName, stylePath);
        if (style) {
          styles.push(style);
          atomsLoaded++;
          console.log(`  ✅ ${componentName}: ${path.basename(stylePath)}`);
        }
      } catch (error) {
        errors.push({ componentName, error: error.message });
        console.warn(`  ⚠️  ${componentName}: ${error.message}`);
      }
    }

    // 2. RodiX 컴포넌트 스타일 로드 (래퍼 스타일)
    console.log('\n📦 RodiX 컴포넌트 스타일 로딩 중...');
    for (const [componentName, stylePath] of Object.entries(config.RODIX_STYLES)) {
      try {
        const style = this.loadComponentStyle(componentName, stylePath);
        if (style) {
          styles.push(style);
          rodixLoaded++;
          console.log(`  ✅ ${componentName}: ${path.basename(stylePath)}`);
        }
      } catch (error) {
        errors.push({ componentName, error: error.message });
        console.warn(`  ⚠️  ${componentName}: ${error.message}`);
      }
    }

    console.log(`\n✅ 스타일 로딩 완료:`);
    console.log(`   전역: ${globalLoaded}개`);
    console.log(`   Atoms: ${atomsLoaded}개`);
    console.log(`   RodiX: ${rodixLoaded}개`);
    console.log(`   총: ${styles.length}개\n`);

    if (errors.length > 0) {
      console.warn(`⚠️  경고: ${errors.length}개 컴포넌트의 스타일을 로드하지 못했습니다\n`);
    }

    return {
      styles: styles.join('\n\n'),
      loaded: styles.length,
      globalLoaded,
      atomsLoaded,
      rodixLoaded,
      errors
    };
  }

  /**
   * 특정 컴포넌트의 스타일 로드
   */
  loadComponentStyle(componentName, stylePath) {
    if (!fs.existsSync(stylePath)) {
      throw new Error(`파일을 찾을 수 없음: ${stylePath}`);
    }

    const stats = fs.statSync(stylePath);

    // 캐시 업데이트
    this.lastModified.set(componentName, stats.mtime);

    // SCSS를 CSS로 컴파일
    const cssContent = this.compileScss(stylePath, componentName);

    this.loadedStyles.set(componentName, cssContent);

    return `/* ${componentName} - ${path.basename(stylePath)} */\n${cssContent}`;
  }

  /**
   * SCSS를 CSS로 컴파일 (실제 sass 컴파일러 사용)
   */
  compileScss(scssPath, componentName) {
    try {
      // sass.compile() 사용 - V3 프로젝트의 styles 폴더를 includePaths에 추가
      const result = sass.compile(scssPath, {
        loadPaths: [
          config.STYLES_DIR,  // V3의 styles 폴더
          path.dirname(scssPath),  // 현재 파일의 디렉토리
          config.RODI_WEB_SVC,  // rodi-web-svc src 폴더
        ],
        style: 'expanded',  // 읽기 쉬운 형태로 출력
        sourceMap: false
      });

      return result.css;
    } catch (error) {
      // 컴파일 실패 시 간단한 변환으로 폴백
      console.warn(`  ⚠️  ${componentName} SCSS 컴파일 실패, 기본 변환 사용: ${error.message}`);
      return this.fallbackConversion(scssPath);
    }
  }

  /**
   * SCSS 컴파일 실패 시 폴백: 간단한 변환
   */
  fallbackConversion(scssPath) {
    const scssContent = fs.readFileSync(scssPath, 'utf8');
    let css = scssContent;

    // 주석 제거
    css = css.replace(/\/\/.*$/gm, '');

    // @import 문 제거
    css = css.replace(/@import\s+['"].*['"];?/g, '');

    // @mixin, @include 등 제거
    css = css.replace(/@mixin\s+[\s\S]*?\{[\s\S]*?\}/g, '');
    css = css.replace(/@include\s+[^;]+;/g, '');
    css = css.replace(/@extend\s+[^;]+;/g, '');

    // 변수 치환
    css = this.replaceCommonVariables(css);

    return css.trim();
  }

  /**
   * 일반적인 SCSS 변수를 CSS 값으로 치환
   */
  replaceCommonVariables(css) {
    // V3 프로젝트의 실제 변수값 적용
    const v3Vars = {
      '$primary-color': '#59d5ef',
      '$dark-primary-color': '#428bca',
      '$danger-color': '#fe6464',
      '$point-color': '#00c0c7',
      '$gray-color': '#cacaca',
      '$lite-gray-color': '#ddd',
      '$disable-color': '#727272',
      '$disable-bg-color': '#b3b8bd',
      '$dark-navy-color': '#20272D',
      '$border-radius-default': '5px',
      '$white': '#ffffff',
      '$black': '#000000',
    };

    for (const [variable, value] of Object.entries(v3Vars)) {
      const regex = new RegExp('\\' + variable + '\\b', 'g');
      css = css.replace(regex, value);
    }

    return css;
  }

  /**
   * 특정 컴포넌트 스타일이 변경되었는지 확인
   */
  hasStyleChanged(componentName) {
    const atomsPath = config.ATOMS_STYLES[componentName];
    const rodixPath = config.RODIX_STYLES[componentName];
    const stylePath = atomsPath || rodixPath;

    if (!stylePath || !fs.existsSync(stylePath)) {
      return false;
    }

    const stats = fs.statSync(stylePath);
    const lastMtime = this.lastModified.get(componentName);

    return !lastMtime || stats.mtime > lastMtime;
  }

  /**
   * 변경된 스타일 다시 로드
   */
  reloadChangedStyles() {
    const reloaded = [];

    // Atoms 체크
    for (const [componentName, stylePath] of Object.entries(config.ATOMS_STYLES)) {
      if (this.hasStyleChanged(componentName)) {
        try {
          this.loadComponentStyle(componentName, stylePath);
          reloaded.push(componentName);
        } catch (error) {
          console.error(`스타일 리로드 실패 (${componentName}):`, error.message);
        }
      }
    }

    // RodiX 체크
    for (const [componentName, stylePath] of Object.entries(config.RODIX_STYLES)) {
      if (this.hasStyleChanged(componentName)) {
        try {
          this.loadComponentStyle(componentName, stylePath);
          reloaded.push(componentName);
        } catch (error) {
          console.error(`스타일 리로드 실패 (${componentName}):`, error.message);
        }
      }
    }

    return reloaded;
  }

  /**
   * 로드된 스타일 통계
   */
  getStats() {
    return {
      totalGlobal: Object.keys(config.GLOBAL_STYLES).length,
      totalAtoms: Object.keys(config.ATOMS_STYLES).length,
      totalRodiX: Object.keys(config.RODIX_STYLES).length,
      totalComponents: Object.keys(config.GLOBAL_STYLES).length + Object.keys(config.ATOMS_STYLES).length + Object.keys(config.RODIX_STYLES).length,
      loadedComponents: this.loadedStyles.size,
      components: Array.from(this.loadedStyles.keys())
    };
  }
}

module.exports = StyleLoader;