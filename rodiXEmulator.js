        class RodiXEmulator {
            constructor() {
                this.components = new Map();
                this.eventHandlers = new Map();
            }

            registerHandler(componentId, handler) {
                if (!componentId || typeof handler !== 'function') {
                    return;
                }

                if (!this.eventHandlers.has(componentId)) {
                    this.eventHandlers.set(componentId, new Set());
                }

                this.eventHandlers.get(componentId).add(handler);
            }

            emitEvent(componentId, type, payload = {}) {
                const handlers = this.eventHandlers.get(componentId);
                if (!handlers || handlers.size === 0) {
                    return;
                }

                handlers.forEach(callback => {
                    try {
                        callback(type, payload);
                    } catch (error) {
                        console.error('RodiX handler error:', {
                            componentId,
                            type,
                            message: error.message
                        });
                    }
                });
            }

            closeOpenSelectBoxes(except = null) {
                document.querySelectorAll('.select-box.open').forEach(box => {
                    if (except && box === except) {
                        return;
                    }

                    const dropdown = box.querySelector('.wrapper');
                    box.classList.remove('open');
                    if (dropdown) {
                        dropdown.style.display = 'none';
                    }
                });
            }

            /**
             * 초기화 - 모든 컴포넌트 스캔 및 이벤트 연결
             */
            init() {
                console.log('\\n[INIT] RodiX 에뮬레이터 초기화 시작...');

                this.scanComponents();
                this.applyVisibility();
                this.applyInitialCheckState();
                this.bindButtonEvents();
                this.bindInputEvents();
                this.bindSelectEvents();
                this.bindSliderEvents();
                this.detectPatterns();

                console.log(\`[OK] 에뮬레이터 초기화 완료 (컴포넌트 \${this.components.size}개)\\n\`);
            }

            /**
             * 페이지의 모든 ID 있는 요소를 스캔
             */
            scanComponents() {
                const elements = document.querySelectorAll('[id]');
                elements.forEach(el => {
                    this.components.set(el.id, el);
                });
                console.log(\`[PACKAGE] 스캔 완료: \${elements.length}개 컴포넌트\`);
            }

            /**
             * data-visible 속성에 따라 초기 표시/숨김 처리
             */
            applyVisibility() {
                const visibleElements = document.querySelectorAll('[data-visible]');
                visibleElements.forEach(el => {
                    const visible = el.getAttribute('data-visible') === 'true';
                    el.style.display = visible ? '' : 'none';
                });
                if (visibleElements.length > 0) {
                    console.log(\`👁️  Visibility 처리: \${visibleElements.length}개 요소\`);
                }
            }

            /**
             * 체크박스/라디오 버튼/슬라이더의 초기 상태 적용
             */
            applyInitialCheckState() {
                // 체크박스 초기 상태
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const wrapper = checkbox.closest('.checkbox-wrapper');
                    if (!wrapper) return;

                    const icon = wrapper.querySelector('.ico-checkbox');
                    if (!icon) return;

                    // checked 속성 처리
                    if (checkbox.checked) {
                        icon.classList.add('checked');
                    }

                    // disabled 속성 처리
                    if (checkbox.disabled) {
                        icon.classList.add('disabled');
                        wrapper.style.cursor = 'not-allowed';
                    }
                });

                // 라디오 버튼 초기 상태
                const radios = document.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    const wrapper = radio.closest('.radio-wrapper');
                    if (!wrapper) return;

                    const icon = wrapper.querySelector('.ico-radio');
                    if (!icon) return;

                    // checked 속성 처리
                    if (radio.checked) {
                        icon.classList.add('checked');
                    }

                    // disabled 속성 처리
                    if (radio.disabled) {
                        icon.classList.add('disabled');
                        wrapper.style.cursor = 'not-allowed';
                    }
                });

                // 슬라이더 초기 상태
                const sliders = document.querySelectorAll('input[type="range"]');
                sliders.forEach(slider => {
                    // disabled 속성 처리 - 브라우저 기본 스타일 적용
                    if (slider.disabled) {
                        slider.style.cursor = 'not-allowed';
                        slider.style.opacity = '0.5';
                    }
                });

                console.log(\`🎛️  초기 상태 적용: 체크박스 \${checkboxes.length}개, 라디오 \${radios.length}개, 슬라이더 \${sliders.length}개\`);
            }

            /**
             * 모든 버튼에 자동 이벤트 연결
             */
            bindButtonEvents() {
                const buttons = document.querySelectorAll('button[id]');
                let count = 0;

                buttons.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.handleButtonClick(btn.id, btn, e);
                    });
                    count++;
                });

                if (count > 0) {
                    console.log(\`🔘 버튼 이벤트 연결: \${count}개\`);
                }
            }

            /**
             * 버튼 클릭 처리 - 패턴 기반 자동 동작
             */
            handleButtonClick(id, element, event) {
                console.log(\`[CLICK]  버튼 클릭: #\${id}\`);

                // 패턴 1: 탭 전환 (active 클래스 토글)
                if (element.classList.contains('btn') && element.parentElement.classList.contains('nav-tab')) {
                    this.handleTabSwitch(id, element);
                    return;
                }

                // 패턴 2: Show 버튼 (메시지 표시)
                if (id.toLowerCase().includes('message') || element.textContent.toLowerCase().includes('show')) {
                    this.handleShowMessage(id);
                    return;
                }

                // 패턴 3: Add 버튼 (추가 동작)
                if (id.toLowerCase().includes('add') || element.textContent.toLowerCase().includes('add')) {
                    this.handleAddAction(id);
                    return;
                }

                // 패턴 4: Delete/Del 버튼 (삭제 동작)
                if (id.toLowerCase().includes('del') || element.textContent.toLowerCase().includes('del')) {
                    this.handleDeleteAction(id);
                    return;
                }

                // 패턴 5: Revert 버튼 (복원 동작)
                if (id.toLowerCase().includes('rvt') || element.textContent.toLowerCase().includes('revert')) {
                    this.handleRevertAction(id);
                    return;
                }
            }

            /**
             * 탭 전환 처리
             */
            handleTabSwitch(activeId, activeElement) {
                // 같은 nav-tab 내의 모든 버튼에서 active 제거
                const navTab = activeElement.parentElement;
                navTab.querySelectorAll('.btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                activeElement.classList.add('active');

                // 관련 div 표시/숨김 (id 패턴 매칭)
                const btnPrefix = activeId.replace(/^btn/, '');
                const divId = 'div' + btnPrefix;

                // 모든 div를 숨기고 해당 div만 표시
                document.querySelectorAll('[id^="div"][data-visible]').forEach(div => {
                    div.style.display = 'none';
                });

                const targetDiv = this.components.get(divId);
                if (targetDiv) {
                    targetDiv.style.display = 'block';
                    console.log(\`  -> 탭 전환: #\${divId} 표시\`);
                }
            }

            /**
             * 메시지 표시 처리
             */
            handleShowMessage(btnId) {
                // 관련 input과 select 찾기
                const inputId = btnId.replace('btn', 'input');
                const selectId = btnId.replace('btn', 'select');

                const input = this.components.get(inputId);
                const select = this.components.get(selectId);

                const message = input ? input.value : 'Message';
                const type = select ? select.value : 'INFO';
                const icon = type === 'ERROR' ? '[ERROR]' : type === 'WARNING' ? '[WARN]' : 'ℹ️';

                alert(\`\${icon} \${type}\\n\\n\${message}\`);
                console.log(\`  -> 메시지 표시: [\${type}] \${message}\`);
            }

            /**
             * 추가 동작 처리
             */
            handleAddAction(btnId) {
                // Option 추가
                if (btnId.toLowerCase().includes('option')) {
                    const selectId = btnId.replace('btnAdd', 'select').replace('Option', '');
                    const select = this.components.get(selectId) ||
                                  this.components.get('selectAddDelOption');

                    if (select && select.tagName === 'SELECT') {
                        const optionCount = select.options.length + 1;
                        const option = document.createElement('option');
                        option.value = \`Option\${optionCount}\`;
                        option.text = \`Option\${optionCount}\`;
                        select.add(option);
                        select.value = option.value;
                        console.log(\`  -> 옵션 추가: Option\${optionCount}\`);
                    }
                }
                // Row 추가
                else if (btnId.toLowerCase().includes('row')) {
                    const tableId = btnId.replace('btnAdd', 'table').replace('Row', '');
                    const table = this.components.get(tableId) ||
                                 this.components.get('tableAddRow');

                    if (table && table.tagName === 'TABLE') {
                        const tbody = table.querySelector('tbody') || table;
                        const firstRow = tbody.querySelector('tr');
                        const cellCount = firstRow ? firstRow.cells.length : 4;

                        const row = tbody.insertRow();
                        for (let i = 0; i < cellCount; i++) {
                            const cell = row.insertCell(i);
                            cell.textContent = 'text';
                        }
                        console.log(\`  -> 테이블 행 추가 (\${cellCount}개 셀)\`);
                    }
                }
            }

            /**
             * 삭제 동작 처리
             */
            handleDeleteAction(btnId) {
                if (btnId.toLowerCase().includes('option')) {
                    const selectId = btnId.replace('btnDel', 'select').replace('Option', '');
                    const select = this.components.get(selectId) ||
                                  this.components.get('selectAddDelOption');

                    if (select && select.tagName === 'SELECT' && select.options.length > 0) {
                        const lastOption = select.options[select.options.length - 1];
                        console.log(\`  -> 옵션 삭제: \${lastOption.text}\`);
                        select.remove(select.options.length - 1);
                        if (select.options.length > 0) {
                            select.selectedIndex = select.options.length - 1;
                        }
                    }
                }
            }

            /**
             * 복원 동작 처리
             */
            handleRevertAction(btnId) {
                const tableId = btnId.replace('btnRvt', 'table');
                const table = this.components.get(tableId) ||
                             this.components.get('tableAddRow');

                if (table && table.tagName === 'TABLE') {
                    // 원본 테이블 구조 복원 (첫 2개 행만 유지)
                    const rows = Array.from(table.rows);
                    while (rows.length > 2) {
                        table.deleteRow(2);
                        rows.pop();
                    }
                    console.log(\`  -> 테이블 복원\`);
                }
            }

            /**
             * Input 이벤트 연결
             */
            bindInputEvents() {
                const inputs = document.querySelectorAll('input[id]');
                let count = 0;

                inputs.forEach(input => {
                    // 일반 input 이벤트
                    input.addEventListener('input', (e) => {
                        console.log(\`[INPUT]  입력: #\${input.id} = "\${e.target.value}"\`);
                    });

                    // 체크박스 change 이벤트
                    if (input.type === 'checkbox') {
                        input.addEventListener('change', (e) => {
                            this.handleCheckboxChange(e.target);
                        });
                    }

                    // 라디오 change 이벤트
                    if (input.type === 'radio') {
                        input.addEventListener('change', (e) => {
                            this.handleRadioChange(e.target);
                        });
                    }

                    count++;
                });

                if (count > 0) {
                    console.log(\`[INPUT]  Input 이벤트 연결: \${count}개\`);
                }
            }

            /**
             * 체크박스 상태 변경 처리
             */
            handleCheckboxChange(checkbox) {
                // disabled 체크박스는 변경 불가
                if (checkbox.disabled) return;

                const wrapper = checkbox.closest('.checkbox-wrapper');
                if (!wrapper) return;

                const icon = wrapper.querySelector('.ico-checkbox');
                if (!icon) return;

                if (checkbox.checked) {
                    icon.classList.add('checked');
                    console.log(\`[OK] 체크박스 체크: #\${checkbox.id}\`);
                } else {
                    icon.classList.remove('checked');
                    console.log(\`☐ 체크박스 해제: #\${checkbox.id}\`);
                }
            }

            /**
             * 라디오 버튼 상태 변경 처리
             */
            handleRadioChange(radio) {
                // disabled 라디오는 변경 불가
                if (radio.disabled) return;

                // 같은 name을 가진 모든 라디오에서 checked 클래스 제거
                if (radio.name) {
                    const radios = document.querySelectorAll(\`input[type="radio"][name="\${radio.name}"]\`);
                    radios.forEach(r => {
                        const wrapper = r.closest('.radio-wrapper');
                        if (wrapper) {
                            const icon = wrapper.querySelector('.ico-radio');
                            if (icon) icon.classList.remove('checked');
                        }
                    });
                }

                // 선택된 라디오에 checked 클래스 추가
                const wrapper = radio.closest('.radio-wrapper');
                if (!wrapper) return;

                const icon = wrapper.querySelector('.ico-radio');
                if (!icon) return;

                icon.classList.add('checked');
                console.log(\`🔘 라디오 선택: #\${radio.id}\`);
            }

            /**
             * Select 이벤트 연결
             */
            bindSelectEvents() {
                const nativeSelects = document.querySelectorAll('select[id]');
                const customSelects = document.querySelectorAll('.select-box[id]');
                let count = 0;

                nativeSelects.forEach(select => {
                    select.addEventListener('change', () => {
                        const option = select.options[select.selectedIndex];
                        const detail = {
                            selected: select.value,
                            label: option ? option.textContent : ''
                        };

                        this.emitEvent(select.id, 'select', detail);
                        select.dispatchEvent(new CustomEvent('rodix-select', { detail }));
                    });
                    count++;
                });

                customSelects.forEach(selectBox => {
                    const placeholder = selectBox.querySelector('.placeholder');
                    const dropdown = selectBox.querySelector('.wrapper');
                    const textEl = placeholder ? placeholder.querySelector('.cell.text') : null;
                    const optionNodes = dropdown ? Array.from(dropdown.querySelectorAll('.drop-down-item')) : [];

                    if (!placeholder || !dropdown || !textEl) {
                        return;
                    }

                    const setActive = (item) => {
                        optionNodes.forEach(opt => opt.classList.remove('active'));
                        if (item) {
                            item.classList.add('active');
                        }
                    };

                    const closeDropdown = () => {
                        selectBox.classList.remove('open');
                        dropdown.style.display = 'none';
                    };

                    const openDropdown = () => {
                        this.closeOpenSelectBoxes(selectBox);
                        selectBox.classList.add('open');
                        dropdown.style.display = 'block';
                    };

                    const emitSelection = (item) => {
                        if (!item) {
                            return;
                        }

                        const value = item.dataset.value || item.textContent.trim();
                        const label = item.textContent.trim();

                        textEl.textContent = label;
                        selectBox.dataset.value = value;

                        const detail = { selected: value, label };
                        this.emitEvent(selectBox.id, 'select', detail);
                        selectBox.dispatchEvent(new CustomEvent('rodix-select', { detail }));
                        selectBox.dispatchEvent(new CustomEvent('change', { detail }));
                    };

                    const activeItem = optionNodes.find(opt => opt.classList.contains('active')) || optionNodes[0];
                    if (activeItem) {
                        setActive(activeItem);
                        selectBox.dataset.value = activeItem.dataset.value || activeItem.textContent.trim();
                        textEl.textContent = activeItem.textContent.trim();
                    } else {
                        selectBox.dataset.value = '';
                    }

                    placeholder.addEventListener('click', (e) => {
                        e.stopPropagation();

                        if (selectBox.classList.contains('open')) {
                            closeDropdown();
                            return;
                        }

                        openDropdown();

                        const handleOutside = (evt) => {
                            if (!selectBox.contains(evt.target)) {
                                closeDropdown();
                            }
                        };

                        document.addEventListener('click', handleOutside, { once: true });
                    });

                    optionNodes.forEach(item => {
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            setActive(item);
                            emitSelection(item);
                            closeDropdown();
                        });
                    });

                    const searchInput = dropdown.querySelector('input.search-mode');
                    if (searchInput) {
                        searchInput.addEventListener('input', (e) => {
                            const keyword = e.target.value.toLowerCase();
                            optionNodes.forEach(item => {
                                const match = item.textContent.toLowerCase().includes(keyword);
                                item.style.display = match ? '' : 'none';
                            });
                        });
                    }

                    count++;
                });

            }

            /**
             * XSlider 이벤트 연결 및 상호작용 구현
             */
            bindSliderEvents() {
                const sliders = document.querySelectorAll('.rc-slider');
                let count = 0;

                sliders.forEach(sliderContainer => {
                    const handle = sliderContainer.querySelector('.rc-slider-handle');
                    const track = sliderContainer.querySelector('.rc-slider-track');
                    const rail = sliderContainer.querySelector('.rc-slider-rail');

                    // keyboard-input 찾기 (같은 xslider 컨테이너 내부)
                    const xsliderContainer = sliderContainer.closest('[class*="xslider"]');
                    const keyboardInput = xsliderContainer ? xsliderContainer.querySelector('.keyboard-input') : null;

                    if (!handle || !track || !rail || !keyboardInput) {
                        console.warn('XSlider 요소 누락:', {
                            handle: !!handle,
                            track: !!track,
                            rail: !!rail,
                            keyboardInput: !!keyboardInput
                        });
                        return;
                    }

                    // 속성에서 min, max, step 읽기
                    const min = parseFloat(handle.getAttribute('aria-valuemin') || '0');
                    const max = parseFloat(handle.getAttribute('aria-valuemax') || '100');
                    const step = parseFloat(keyboardInput.step || '1');
                    const disabled = handle.getAttribute('aria-disabled') === 'true';

                    if (disabled) return; // disabled 슬라이더는 이벤트 연결 안 함

                    let currentValue = parseFloat(handle.getAttribute('aria-valuenow') || min);

                    // 드래그 상태
                    let isDragging = false;

                    // 값을 percentage로 변환
                    const valueToPercent = (value) => {
                        return ((value - min) / (max - min)) * 100;
                    };

                    // percentage를 값으로 변환
                    const percentToValue = (percent) => {
                        let value = (percent / 100) * (max - min) + min;
                        // step에 맞춰 반올림
                        value = Math.round(value / step) * step;
                        // 범위 제한
                        return Math.max(min, Math.min(max, value));
                    };

                    // UI 업데이트
                    const updateUI = (value) => {
                        const percent = valueToPercent(value);
                        handle.style.left = percent + '%';
                        track.style.width = percent + '%';
                        handle.setAttribute('aria-valuenow', value);
                        keyboardInput.value = value;
                        currentValue = value;
                    };

                    // 마우스 위치에서 값 계산
                    const getValueFromMouseEvent = (e) => {
                        const rect = rail.getBoundingClientRect();
                        const percent = ((e.clientX - rect.left) / rect.width) * 100;
                        return percentToValue(Math.max(0, Math.min(100, percent)));
                    };

                    // 드래그 시작
                    handle.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        isDragging = true;
                        handle.focus();
                        document.body.style.cursor = 'grabbing';
                        console.log(\`🎚️  슬라이더 드래그 시작: #\${sliderContainer.id}\`);
                    });

                    // 드래그 중
                    const onMouseMove = (e) => {
                        if (!isDragging) return;
                        const value = getValueFromMouseEvent(e);
                        updateUI(value);
                    };

                    // 드래그 끝
                    const onMouseUp = () => {
                        if (isDragging) {
                            isDragging = false;
                            document.body.style.cursor = '';
                            console.log(\`🎚️  슬라이더 값 변경: #\${sliderContainer.id} = \${currentValue}\`);
                        }
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);

                    // Rail 클릭으로 직접 이동
                    rail.addEventListener('click', (e) => {
                        if (disabled || e.target === handle) return;
                        const value = getValueFromMouseEvent(e);
                        updateUI(value);
                        console.log(\`🎚️  슬라이더 클릭 이동: #\${sliderContainer.id} = \${value}\`);
                    });

                    // 키보드 입력과 동기화
                    keyboardInput.addEventListener('input', (e) => {
                        let value = parseFloat(e.target.value);
                        if (isNaN(value)) return;

                        // 범위 제한
                        value = Math.max(min, Math.min(max, value));
                        updateUI(value);
                    });

                    // 키보드 입력에서 엔터나 포커스 아웃 시 step 적용
                    const applyStep = () => {
                        let value = parseFloat(keyboardInput.value);
                        if (isNaN(value)) {
                            value = currentValue;
                        } else {
                            value = Math.round(value / step) * step;
                            value = Math.max(min, Math.min(max, value));
                        }
                        updateUI(value);
                        console.log(\`[INPUT]  키보드 입력: #\${sliderContainer.id} = \${value}\`);
                    };

                    keyboardInput.addEventListener('blur', applyStep);
                    keyboardInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            applyStep();
                            keyboardInput.blur();
                        }
                    });

                    // 핸들에서 키보드 방향키 지원
                    handle.addEventListener('keydown', (e) => {
                        let newValue = currentValue;

                        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            newValue = Math.min(max, currentValue + step);
                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            newValue = Math.max(min, currentValue - step);
                        } else if (e.key === 'Home') {
                            e.preventDefault();
                            newValue = min;
                        } else if (e.key === 'End') {
                            e.preventDefault();
                            newValue = max;
                        } else {
                            return;
                        }

                        updateUI(newValue);
                        console.log(\`[INPUT]  키보드 조작: #\${sliderContainer.id} = \${newValue}\`);
                    });

                    count++;
                });

                if (count > 0) {
                    console.log(\`🎚️  Slider 이벤트 연결: \${count}개\`);
                }
            }

            /**
             * 패턴 감지 및 로깅
             */
            detectPatterns() {
                const patterns = {
                    tabs: document.querySelectorAll('.nav-tab .btn').length,
                    visibleDivs: document.querySelectorAll('[data-visible]').length,
                    addButtons: document.querySelectorAll('button[id*="Add"], button[id*="add"]').length,
                    delButtons: document.querySelectorAll('button[id*="Del"], button[id*="del"]').length,
                };

                console.log('[SRC] 감지된 패턴:');
                if (patterns.tabs > 0) console.log(\`  - 탭 시스템: \${patterns.tabs}개 탭\`);
                if (patterns.visibleDivs > 0) console.log(\`  - Visible 컨트롤: \${patterns.visibleDivs}개\`);
                if (patterns.addButtons > 0) console.log(\`  - 추가 버튼: \${patterns.addButtons}개\`);
                if (patterns.delButtons > 0) console.log(\`  - 삭제 버튼: \${patterns.delButtons}개\`);
            }
        }
