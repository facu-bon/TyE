let newsData = {};
let activeTabId = null;
let nextTabId = 1;
let imageCounters = {};
const BASE_URL = "https://www.transporteyenergia.com.ar";

function isValidUrl(string) {
    if (!string || typeof string !== 'string') return false;
    return string.startsWith('http://') || string.startsWith('https://');
}
function slugify(text) { if (!text) return ''; return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, 'n').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').substring(0, 70); }
function getActiveForm() { return document.querySelector('.tab-content.active form'); }

document.addEventListener('DOMContentLoaded', () => {
    addTab();
    setupGlobalListeners();
    window.addEventListener('beforeunload', (event) => {
        event.preventDefault();
        event.returnValue = '¿Estás seguro? Los datos no guardados se perderán.';
        return '¿Estás seguro? Los datos no guardados se perderán.';
    });
});

function addTab() {
    saveCurrentTabData();
    const tabId = `tab-${nextTabId}`;
    const contentId = `content-${nextTabId}`;
    const tabIndex = nextTabId;
    nextTabId++;
    const tabButton = document.createElement('button');
    tabButton.id = tabId;
    tabButton.className = 'tab-button';
    tabButton.innerHTML = `Noticia ${tabIndex} <button class="close-tab-btn" title="Cerrar pestaña">&times;</button>`;
    document.getElementById('tab-buttons').appendChild(tabButton);
    const template = document.getElementById('news-form-template');
    if (!template) { console.error("Template not found!"); return; }
    const clone = template.content.cloneNode(true);
    const formContainer = document.createElement('div');
    formContainer.id = contentId;
    formContainer.className = 'tab-content';
    formContainer.appendChild(clone);
    document.getElementById('tab-content-container').appendChild(formContainer);
    newsData[tabId] = { id: tabId, data: {} };
    switchTab(tabId);
}

function switchTab(tabId) {
    saveCurrentTabData();
    activeTabId = tabId;
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    const contentToShow = document.getElementById(tabId.replace('tab-', 'content-'));
    const buttonToActivate = document.getElementById(tabId);
    if (contentToShow) contentToShow.classList.add('active');
    if (buttonToActivate) buttonToActivate.classList.add('active');
    loadTabData(tabId);
    clearOutputs();
    updateViewportPreview(document.getElementById('viewport-preview-individual'), '', false, false);
    updateViewportPreview(document.getElementById('viewport-preview-index'), '', false, true);
    if (contentToShow) {
        setupListenersForTab(contentToShow);
    }
}

function closeTab(tabId) {
    const tabButton = document.getElementById(tabId); const tabContent = document.getElementById(tabId.replace('tab-', 'content-')); const tabDataIndex = Object.keys(newsData).findIndex(key => key === tabId);
    if (tabButton && tabContent) {
        const isActive = tabButton.classList.contains('active'); tabButton.remove(); tabContent.remove(); delete newsData[tabId];
        if (isActive) {
            activeTabId = null; const remainingKeys = Object.keys(newsData);
            if (remainingKeys.length > 0) { const newActiveIndex = Math.max(0, tabDataIndex - 1); if (remainingKeys[newActiveIndex]) { switchTab(remainingKeys[newActiveIndex]); } else if (remainingKeys[0]) { switchTab(remainingKeys[0]); } else { addTab(); } }
            else { addTab(); }
        }
        renumberTabs();
    }
}
function renumberTabs() {
    document.querySelectorAll('.tab-button').forEach((btn, index) => {
        const closeBtnHTML = btn.querySelector('.close-tab-btn')?.outerHTML || ''; btn.textContent = `Noticia ${index + 1} `; if (closeBtnHTML) btn.insertAdjacentHTML('beforeend', closeBtnHTML);
        const closeButton = btn.querySelector('.close-tab-btn'); if (closeButton) { closeButton.onclick = (e) => { e.stopPropagation(); closeTab(btn.id); }; }
    });
}

function saveCurrentTabData() {
    if (!activeTabId) return; const form = getActiveForm(); if (!form) return; const dataObject = {}; new FormData(form).forEach((value, key) => dataObject[key] = value); dataObject['modo_antonio_rossi'] = form.querySelector('[name="modo_antonio_rossi"]').checked; dataObject.additionalImages = Array.from(form.querySelectorAll('.additional-image-field')).map(field => ({ url: field.querySelector('.image-url')?.value || '', type: field.querySelector('.image-type-selector')?.value || 'Transporte' }));
    newsData[activeTabId] = { id: activeTabId, data: dataObject };
}
function loadTabData(tabId) {
    const tabData = newsData[tabId]?.data || {}; const form = getActiveForm(); if (!form) return; form.reset(); form.querySelector('.additional-images-container').innerHTML = '';
    Object.keys(tabData).forEach(key => { if (key !== 'additionalImages') { const element = form.querySelector(`[name="${key}"]`); if (element) { if (element.type === 'checkbox') element.checked = !!tabData[key]; else element.value = tabData[key] || ''; } } });
    if (tabData.additionalImages) { tabData.additionalImages.forEach(img => addImageFieldDirect(form, img.url, img.type)); }
}

function setupListenersForTab(formContainer) {
    formContainer.onclick = function (event) {
        const target = event.target.closest('button');
        if (!target) return;

        const isCopyBtn = target.classList.contains('copy-btn') || target.classList.contains('copy-filename-btn');
        if (!isCopyBtn) {
            event.preventDefault();
        }

        if (target.classList.contains('copy-filename-btn')) handleCopyClick(event);
        else if (target.classList.contains('copy-image-btn')) handleCopyImageClick(event);
        else if (target.classList.contains('show-name-btn')) handleShowNameClick(event);
        else if (target.classList.contains('increment-btn')) handleIncrementClick(event);
        else if (target.classList.contains('add-btn')) addImageField(target);
        else if (target.classList.contains('remove-btn')) removeImageField(target.closest('.additional-image-field'));
        else if (target.classList.contains('btn-bold')) handleFormatBold(event);
        else if (target.classList.contains('btn-list')) handleFormatList(event);
        else if (target.classList.contains('main-btn')) generarCodigo();
    };

    formContainer.querySelectorAll('.image-url').forEach(i => {
        i.addEventListener('input', updateImagePreviewHandler, { passive: true });
        i.addEventListener('change', updateImagePreviewHandler);
        updateImagePreview(i);
    });

    formContainer.querySelectorAll('.image-type-selector').forEach(s => {
        s.addEventListener('change', (event) => {
            const btn = event.target.closest('.image-input-controls, .additional-image-field').querySelector('.show-name-btn');
            if (btn) showImageName(btn, true);
        });
    });

    formContainer.querySelectorAll('.show-name-btn').forEach(b => showImageName(b));

    const rossiCheckbox = formContainer.querySelector('[name="modo_antonio_rossi"]');
    rossiCheckbox.addEventListener('change', (event) => {
        handleRossiModeChange(event);
        formContainer.querySelectorAll('.show-name-btn').forEach(btn => showImageName(btn, true));
    });
    handleRossiModeChange({ target: rossiCheckbox });
}

function setupGlobalListeners() {
    document.querySelector('.output-area').addEventListener('click', (event) => {
        const button = event.target.closest('button.copy-btn');
        if (button && button.hasAttribute('data-target')) {
            handleCopyClick(event);
        }
    });
    document.getElementById('add-tab-btn').onclick = addTab;
    document.querySelector('.preview-tabs').addEventListener('click', (event) => {
        const button = event.target.closest('.preview-tab-btn'); if (!button) return; event.preventDefault();
        const isActive = button.classList.contains('active'); if (isActive) return;
        document.querySelectorAll('.preview-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.viewport-preview').forEach(vp => vp.classList.remove('active'));
        button.classList.add('active'); const targetId = button.getAttribute('data-target');
        const targetViewport = document.getElementById(targetId); if (targetViewport) targetViewport.classList.add('active');
        const isRossi = getActiveForm()?.querySelector('[name="modo_antonio_rossi"]')?.checked || false;
        document.querySelectorAll('.preview-tab-btn.active').forEach(btn => btn.classList.toggle('rossi-mode', isRossi));
    });
}

function handleCopyClick(event) {
    event.preventDefault(); const button = event.target.closest('button'); if (!button) return; let targetElement;
    if (button.classList.contains('copy-filename-btn')) { targetElement = button.closest('.filename-display-group').querySelector('.filename-display'); }
    else { const targetId = button.getAttribute('data-target'); targetElement = document.getElementById(targetId); }
    copyToClipboard(targetElement, button);
}
async function handleCopyImageClick(event) {
    event.preventDefault(); const button = event.target.closest('button'); if (!button) return;
    const wrapper = button.closest('.image-group, .additional-image-field'); const urlInput = wrapper?.querySelector('.image-url'); const url = urlInput?.value;
    if (!url || !isValidUrl(url)) { alert("La URL de la imagen no es válida para ser copiada."); return; }
    showCopyFeedback(button, "Copiando...");
    try {
        const response = await fetch(url); if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        const blob = await response.blob(); await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        showCopyFeedback(button, "¡Imagen Copiada!"); alert("¡Imagen copiada!\n\nAbre Paint y presiona Ctrl+V para pegarla.");
    } catch (err) { console.error("Error al copiar imagen:", err); alert("Error al copiar la imagen (puede ser un error de CORS).\nIntenta copiar la URL, abrirla en una nueva pestaña y copiarla desde allí."); showCopyFeedback(button, "Error"); }
}
function handleShowNameClick(event) { event.preventDefault(); showImageName(event.target.closest('button'), true); }
function updateImagePreviewHandler(event) { updateImagePreview(event.target); }
function handleIncrementClick(event) { event.preventDefault(); const button = event.target.closest('button'); if (!button) return; const direction = parseInt(button.dataset.direction); changeImageIndex(button, direction); }
function handleRossiModeChange(event) {
    const isChecked = event.target.checked;
    const container = event.target.closest('.container');
    if (container) { container.classList.toggle('rossi-mode', isChecked); }
    document.querySelectorAll('.preview-tab-btn.active').forEach(btn => btn.classList.toggle('rossi-mode', isChecked));
}

function handleFormatBold(event) {
    event.preventDefault(); const form = getActiveForm(); if (!form) return; const textarea = form.querySelector('.body-textarea'); if (!textarea) return;
    const start = textarea.selectionStart, end = textarea.selectionEnd, fullText = textarea.value, selectedText = fullText.substring(start, end);
    if (selectedText) { textarea.value = `${fullText.substring(0, start)}**${selectedText}**${fullText.substring(end)}`; textarea.focus(); textarea.setSelectionRange(start + 2, end + 2); }
    else { textarea.value = `${fullText.substring(0, start)}****${fullText.substring(end)}`; textarea.focus(); textarea.setSelectionRange(start + 2, start + 2); }
}
function handleFormatList(event) {
    event.preventDefault(); const form = getActiveForm(); if (!form) return; const textarea = form.querySelector('.body-textarea'); if (!textarea) return;
    const start = textarea.selectionStart, end = textarea.selectionEnd, fullText = textarea.value;
    const lineStartIndex = fullText.lastIndexOf('\n', start - 1) + 1; let lineEndIndex = fullText.indexOf('\n', end); if (lineEndIndex === -1) lineEndIndex = fullText.length;
    const selectedLinesText = fullText.substring(lineStartIndex, lineEndIndex); const lines = selectedLinesText.split('\n'); let charsAdded = 0;
    let allAreLists = lines.every(line => line.trim().startsWith('* ') || line.trim().startsWith('- ') || line.trim() === '');
    const formattedLines = lines.map(line => {
        if (line.trim() === '') return line;
        if (allAreLists) { const unformattedLine = line.replace(/^[\s\t]*[\*\-]\s?/, ''); charsAdded -= (line.length - unformattedLine.length); return unformattedLine; }
        else { if (!line.trim().startsWith('* ') && !line.trim().startsWith('- ')) { charsAdded += 2; return `* ${line}`; } return line; }
    });
    const formattedText = formattedLines.join('\n'); textarea.value = `${fullText.substring(0, lineStartIndex)}${formattedText}${fullText.substring(lineEndIndex)}`;
    textarea.focus(); textarea.setSelectionRange(lineStartIndex, lineEndIndex + charsAdded);
}

function generarCodigo() {
    saveCurrentTabData();
    const currentData = newsData[activeTabId]?.data;
    if (!currentData) { alert("Error: No se encontraron datos."); return; }
    const { titulo = '', imagen_principal = '', body = '', modo_antonio_rossi = false, bajada = '', imagen_principal_type = 'Transporte', epigrafe = '', fuente = '', additionalImages = [] } = currentData;
    if (!titulo || !body) { alert("Completa Título y Cuerpo."); return; }
    const hoy = new Date(); const anio = hoy.getFullYear(); const mes = (hoy.getMonth() + 1).toString().padStart(2, '0'); const dia = hoy.getDate().toString().padStart(2, '0'); const fechaSidebar = `${dia}/${mes}/${anio.toString().substr(-2)}`; const fechaArchivo = `${anio}-${mes}-${dia}`; const fechaListaTitulos = `${dia}.${mes}.${anio.toString().substr(-2)}`; const slug = slugify(titulo);
    imageCounters = {};
    const form = getActiveForm();
    const filenameInputPrincipal = form.querySelector('.image-group .filename-display');
    let imgFilenamePrincipal = filenameInputPrincipal?.value || (imagen_principal ? generateImageFilename(fechaArchivo, modo_antonio_rossi ? 'AR' : imagen_principal_type, 1) : '');
    if (filenameInputPrincipal && !filenameInputPrincipal.value && imgFilenamePrincipal) filenameInputPrincipal.value = imgFilenamePrincipal;
    let filename, urlIndividual, urlIndex, imgPathIndex, carpetaIndex, imgPathIndividual, urlTitulosRossi, canonicalUrl, imgPathIndexFull;
    if (modo_antonio_rossi) {
        filename = `${slug}.html`; urlIndex = `Noticias/Antonio-Rossi/${anio}/${filename}`; urlIndividual = `../../${urlIndex}`; urlTitulosRossi = `../../Antonio-Rossi/${anio}/${filename}`; carpetaIndex = 'Imagenes/ImgAntonio/'; imgPathIndividual = imgFilenamePrincipal ? `../../../${carpetaIndex}${imgFilenamePrincipal}` : ''; imgPathIndex = imgFilenamePrincipal ? (carpetaIndex + imgFilenamePrincipal) : '';
    } else {
        filename = `${slug}.html`; urlIndex = `Noticias-${anio}${mes}/${filename}`;
        urlIndividual = `../../${urlIndex}`; carpetaIndex = 'Imagenes/';
        imgPathIndividual = imgFilenamePrincipal ? `../../${carpetaIndex}${imgFilenamePrincipal}` : '';
        imgPathIndex = imgFilenamePrincipal ? (carpetaIndex + imgFilenamePrincipal) : '';
    }
    canonicalUrl = `${BASE_URL}/Noticias/${urlIndex}`;
    imgPathIndexFull = imgPathIndex ? `${BASE_URL}/${imgPathIndex}` : '';
    const bodyProcesado = procesarCuerpo(body);
    const outputFilenameEl = document.getElementById('output_filename'); const outputMetatagsEl = document.getElementById('output_metatags'); const outputTitulosEl = document.getElementById('output_titulos'); const outputIndividualEl = document.getElementById('output_individual'); const outputIndexEl = document.getElementById('output_index'); const outputAdditionalImagesEl = document.getElementById('output_additional_images'); const additionalOutputGroup = document.getElementById('output-additional-images-group');
    if (outputFilenameEl) outputFilenameEl.value = filename;
    const metaTitle = titulo.replace(/"/g, '“'); let htmlMetaTags = '';
    htmlMetaTags += `<title>${metaTitle}</title>\n`; if (imgPathIndexFull) htmlMetaTags += `<meta property="og:image" content="${imgPathIndexFull}"/>\n`;
    htmlMetaTags += `<link rel="canonical" href="${canonicalUrl}"/>\n`; htmlMetaTags += `<meta property="og:title" content="${metaTitle} - Transporte y Energia "/>\n`; htmlMetaTags += `<meta property="og:url" content="${canonicalUrl}"/>\n`; htmlMetaTags += `<meta property="og:site_name" content="TransporteyEnergia" />`;
    if (outputMetatagsEl) outputMetatagsEl.value = htmlMetaTags;


    // nombre del titulos 
    let htmlTitulos = ''; if (modo_antonio_rossi) {
        htmlTitulos = `<li><dd><a href="${urlTitulosRossi}">${fechaListaTitulos} - ${titulo} </a></dd></li>`;
    } else {
        htmlTitulos = `<li><dd><a href="${urlIndividual}">\n ${fechaListaTitulos} - ${titulo}</a></dd></li>`;
    } if (outputTitulosEl) outputTitulosEl.value = htmlTitulos;
    let htmlIndividual = '';



    htmlIndividual += `<h4><span class="sidebar">${fechaSidebar}</span><br/></h4>\n`;
    htmlIndividual += `<Titulo>${titulo}</Titulo><br /><br />\n`;
    if (bajada || modo_antonio_rossi) { htmlIndividual += `<Bajada>${bajada || ''}`; if (modo_antonio_rossi) { htmlIndividual += `<br/><br/>Por Antonio Rossi `; } htmlIndividual += `</Bajada><br/><br/>\n`; }
    if (imgPathIndividual) { htmlIndividual += `<img src="${imgPathIndividual}" style="width:100%"/><br/>\n`; htmlIndividual += `<pie>${epigrafe || ''}</pie><br/>\n\n`; }
    htmlIndividual += `${bodyProcesado}\n\n`; let htmlAdditionalImagesOutput = '', htmlAdditionalImagesIndividual = ''; let imgCounter = 2;
    form.querySelectorAll('.additional-image-field').forEach(field => { const url = field.querySelector('.image-url').value; const type = field.querySelector('.image-type-selector').value; const filenameInputAdicional = field.querySelector('.filename-display'); if (!url) return; let imgFilenameAdicional = filenameInputAdicional?.value; const tipoImg = modo_antonio_rossi ? 'AR' : type; if (!imgFilenameAdicional) { imgFilenameAdicional = generateImageFilename(fechaArchivo, tipoImg, imgCounter++); if (filenameInputAdicional) filenameInputAdicional.value = imgFilenameAdicional; } const carpetaIndexAdicional = tipoImg === 'AR' ? 'Imagenes/ImgAntonio/' : 'Imagenes/'; const imgPathIndividualAdicional = (modo_antonio_rossi ? '../../../' : '../../') + carpetaIndexAdicional + imgFilenameAdicional; const imgPathIndexAdicional = carpetaIndexAdicional + imgFilenameAdicional; htmlAdditionalImagesIndividual += `<p><img src="${imgPathIndividualAdicional}" style="width:100%"/></p>\n`; htmlAdditionalImagesOutput += `<p><img src="${imgPathIndexAdicional}" style="width:100%"/></p>\n\n`; });
    if (htmlAdditionalImagesIndividual) htmlIndividual += htmlAdditionalImagesIndividual; if (fuente) htmlIndividual += `<p>Fuente: ${fuente}</p>\n`; if (outputIndividualEl) outputIndividualEl.value = htmlIndividual.trim();
    if (additionalOutputGroup && outputAdditionalImagesEl) { if (htmlAdditionalImagesOutput) { additionalOutputGroup.classList.remove('hidden'); outputAdditionalImagesEl.value = htmlAdditionalImagesOutput.trim(); } else { additionalOutputGroup.classList.add('hidden'); outputAdditionalImagesEl.value = ''; } }
    let htmlIndex = ''; if (modo_antonio_rossi) {
        htmlIndex = `<div id="seComenta"> <div id="NotaAntonio"><br />\n<a href="${urlIndex}">\n<Titulo>${titulo}</Titulo><br /><br />\n`; if (imgPathIndex) htmlIndex += `<img src="${imgPathIndex}" style="width:100%"/><br/>\n`; const parrafos = bajada ? [bajada, ...obtenerPrimerosParrafos(body, 2)] : obtenerPrimerosParrafos(body, 2); if (parrafos.length > 0) htmlIndex += parrafos.map(p => `<p>${p}</p>`).join('\n') + '\n';


        htmlIndex += `</a></div></div>`;
    }
    else {
        htmlIndex = `<div class="SubColumna" id="SubColumna"><br />\n<a href="Noticias/${urlIndex}">\n<Titulo>${titulo}</Titulo><br /><br />\n`;
        if (bajada) htmlIndex += `<Bajada>${bajada}</Bajada><br/><br/>\n`;
        if (imgPathIndex) {
            htmlIndex += `<div id="fotoInicio"><img src="${imgPathIndex}" style="width:100%"/>\n`;
            if (epigrafe) htmlIndex += `<div id="epigrafe"><pie>${epigrafe}</pie></div>\n`;
            htmlIndex += `</div>`;
        } htmlIndex += `</a><p> </p><img src="Imagenes/Galeria/separacion_columna.jpg" width="480" /> </div>`;
    }
    if (outputIndexEl) outputIndexEl.value = htmlIndex.trim();
    updateViewportPreview(document.getElementById('viewport-preview-individual'), htmlIndividual, modo_antonio_rossi, false);
    updateViewportPreview(document.getElementById('viewport-preview-index'), htmlIndex, modo_antonio_rossi, true);
}

function copyToClipboard(element, button) { if (!button || !element || typeof element.value === 'undefined') { return; } const textToCopy = element.value; if (!textToCopy) { return; } if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(textToCopy).then(() => { showCopyFeedback(button); }).catch(err => { console.warn('Fallo navigator.clipboard, usando fallback.', err); copyUsingExecCommand(textToCopy, button); }); } else { copyUsingExecCommand(textToCopy, button); } }
function copyUsingExecCommand(text, button) { const tempTextArea = document.createElement('textarea'); tempTextArea.value = text; tempTextArea.style.position = 'absolute'; tempTextArea.style.left = '-9999px'; document.body.appendChild(tempTextArea); tempTextArea.select(); tempTextArea.setSelectionRange(0, 99999); try { const successful = document.execCommand('copy'); if (successful) { showCopyFeedback(button); } else { alert('No se pudo copiar el texto.'); } } catch (err) { alert('No se pudo copiar el texto.'); } document.body.removeChild(tempTextArea); }
function showCopyFeedback(button, text = '¡Copiado!') { if (!button) return; const originalText = button.textContent; button.textContent = text; button.classList.add('copied'); setTimeout(() => { button.textContent = originalText; button.classList.remove('copied'); }, 1500); }
function updateImagePreview(inputEl) { if (!inputEl) return; const group = inputEl.closest('.image-group, .additional-image-field'); if (!group) return; const feedback = group.querySelector('.image-input-feedback'); if (!feedback) return; const previewImg = feedback.querySelector('.image-preview'); const placeholder = feedback.querySelector('.preview-placeholder'); if (!previewImg || !placeholder) return; const url = inputEl.value.trim(); if (isValidUrl(url)) { previewImg.src = url; previewImg.classList.remove('hidden'); placeholder.classList.add('hidden'); previewImg.onerror = () => { previewImg.classList.add('hidden'); placeholder.classList.remove('hidden'); placeholder.textContent = "Error URL"; }; } else { previewImg.classList.add('hidden'); placeholder.classList.remove('hidden'); placeholder.textContent = "Vista Previa"; previewImg.src = "#"; } }
function showImageName(button, forceUpdate = false) {
    try {
        if (!button) return;
        const wrapper = button.closest('.image-group, .additional-image-field');
        const typeSelect = wrapper.querySelector('.image-type-selector');
        const filenameDisplay = wrapper.querySelector('.filename-display');
        const form = button.closest('form');
        if (!form || !typeSelect || !filenameDisplay) { return; }
        if (!filenameDisplay.value || forceUpdate) {
            const modoRossi = form.querySelector('[name="modo_antonio_rossi"]').checked;
            const isPrincipal = wrapper.classList.contains('image-group');
            let indice = isPrincipal ? 1 : Array.from(form.querySelectorAll('.additional-image-field')).indexOf(wrapper) + 2;
            const hoy = new Date();
            const fecha = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
            const tipo = modoRossi ? 'AR' : typeSelect.value;
            filenameDisplay.value = generateImageFilenamePlaceholder(fecha, tipo, indice);
        }
    } catch (e) { }
}
function addImageField(button) { const form = button.closest('form'); addImageFieldDirect(form); }
function addImageFieldDirect(form, url = '', type = 'Transporte') {
    const container = form.querySelector('.additional-images-container'); if (!container) return;
    const fieldWrapper = document.createElement('div'); fieldWrapper.className = 'additional-image-field';
    fieldWrapper.innerHTML = `
        <div class="image-input-controls"> <select class="image-type-selector" name="imagen_adicional_type_${container.children.length}"> <option value="Transporte">Transporte</option> <option value="Energia">Energia</option> <option value="AR">Antonio Rossi (AR)</option> </select> <input type="url" class="image-url" name="imagen_adicional_url_${container.children.length}" placeholder="https://..."> <button type="button" class="show-name-btn">Mostrar Nombre</button> </div>
        <div class="image-input-feedback"> <div class="image-preview-container"> <img src="#" alt="Vista previa adicional" class="image-preview hidden"> <span class="preview-placeholder">Vista Previa</span> </div> <div class="filename-display-group"> <label>Nombre Sugerido:</label> <div class="filename-controls"> <input type="text" class="filename-display" readonly> <button type="button" class="increment-btn" data-direction="-1">-</button> <button type="button" class="increment-btn" data-direction="1">+</button> </div> <button type="button" class="copy-btn copy-filename-btn">Copiar Nombre</button> <button type="button" class="copy-btn copy-image-btn">Copiar Imagen</button> </div> </div>
        <button type="button" class="remove-btn">Eliminar</button> `;
    container.appendChild(fieldWrapper);
    const newUrlInput = fieldWrapper.querySelector('.image-url');
    const newTypeSelect = fieldWrapper.querySelector('.image-type-selector');
    newUrlInput.value = url;
    newTypeSelect.value = type;
    newUrlInput.addEventListener('input', updateImagePreviewHandler);
    newUrlInput.addEventListener('change', updateImagePreviewHandler);
    newTypeSelect.addEventListener('change', (event) => { const btn = event.target.closest('.image-input-controls').querySelector('.show-name-btn'); if (btn) showImageName(btn, true); });
    fieldWrapper.querySelector('.remove-btn').onclick = () => removeImageField(fieldWrapper);
    updateImagePreview(newUrlInput);
    showImageName(fieldWrapper.querySelector('.show-name-btn'));
}
function removeImageField(fieldWrapper) { fieldWrapper.remove(); const activeForm = getActiveForm(); if (activeForm && activeForm.querySelectorAll('.additional-image-field').length === 0) { document.getElementById('output-additional-images-group')?.classList.add('hidden'); } }
function generateImageFilename(fecha, tipo, indice) { const key = `${fecha}-${tipo}`; if (indice === 1) { imageCounters[key] = 1; } else { imageCounters[key] = (imageCounters[key] || 1) + 1; } const numero = imageCounters[key].toString().padStart(3, '0'); const extension = 'jpg'; const prefijo = (tipo === 'AR') ? 'AR' : tipo; return `${fecha}-${prefijo}${numero}.${extension}`; }

// ESTA ES LA FUNCIÓN CORREGIDA
function generateImageFilenamePlaceholder(fecha, tipo, indice) {
    const extension = 'jpg'; // <-- ARREGLO: Agregá esta línea
    const numero = indice.toString().padStart(3, '0');
    const prefijo = (tipo === 'AR') ? 'AR' : tipo;
    return `${fecha}-${prefijo}${numero}.${extension}`;
}
function changeImageIndex(button, direction) { const filenameInput = button.closest('.filename-controls')?.querySelector('.filename-display'); if (!filenameInput || !filenameInput.value) return; const regex = /(.*-)([a-zA-Z]+)(\d{3})(\.jpg)/; const match = filenameInput.value.match(regex); if (match) { let [, pre, tipo, numStr, ext] = match; let num = parseInt(numStr, 10); num = Math.max(1, num + direction); filenameInput.value = `${pre}${tipo}${num.toString().padStart(3, '0')}${ext}`; } }
function updateViewportPreview(iframe, contentHtml, esModoRossi, isIndex = false) {
    if (!iframe) return; const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document; if (!iframeDocument) { console.error("Could not access iframe document."); return; }
    const baseStyles = ` body { font-family: 'Trebuchet MS', Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #404040; background-color: #FFF; margin: 15px; } img { max-width: 100%; height: auto; display: block; } p { font-size: 14px; line-height: 1.6; color: #404040; margin-bottom: 1em; } strong, b { font-weight: bold; color: inherit; } ul { list-style-type: disc; margin-left: 20px; padding-left: 20px; margin-bottom: 1em; color: #404040; } li { font-size: 14px; line-height: 1.6; margin-bottom: 0.5em; } em { font-style: italic; } Titulo { display: block; font-family: Arial, Helvetica, sans-serif; font-size: 20px; line-height: 1.2; color: #036; margin-bottom: 0.5em; font-weight: bold; } Bajada { display: block; font-size: 14px; line-height: 1.5; color: #666; margin-bottom: 1em; } pie { display: block; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; color: #666; font-style: normal; text-align: left; margin-top: 0; margin-bottom: 1.5em; } `;
    const individualStyles = ` h4 { margin: 0; padding: 0; font-size: 1em; font-weight: normal; margin-bottom: 1em; } .sidebar { font-size: 14px; color: #000; font-weight: bold; } img { margin-bottom: 0.3em; } `;
    const indexStyles = ` .SubColumna, #NotaAntonio { width: 100%; } #seComenta { background-color: #F0F0F0; padding: 10px; } a { text-decoration: none; color: inherit; } #NotaAntonio Titulo { color: #A60000; } #NotaAntonio p { font-size: 13px; color: #333; margin-bottom: 0.5em; } .SubColumna #fotoInicio { margin-bottom: 5px; } `;
    const fullHtml = ` <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Vista Previa</title><style> body, h1, h2, h3, h4, p, ul, li, img, Titulo, Bajada, pie, div { margin: 0; padding: 0; border: 0; font: inherit; vertical-align: baseline; display: block; box-sizing: border-box; } ul { list-style: disc; } body { line-height: 1; } ${baseStyles} ${isIndex ? individualStyles : indexStyles} </style></head><body><div style="max-width: 480px; margin: 0 auto;">${contentHtml}</div></body></html>`;
    if ('srcdoc' in iframe) iframe.srcdoc = fullHtml;
}
function procesarCuerpo(t) { if (!t) return ''; const l = t.split('\n'); let h = ''; let iL = false; l.forEach(l => { l = l.trim(); l = l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>').replace(/<strong>(.*?)<\/strong>/gi, '<strong>$1</strong>'); if (l.startsWith('* ') || l.startsWith('- ')) { if (!iL) { h += '<ul>\n'; iL = true } const i = l.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>'); h += `  <li>${i}</li>\n` } else { if (iL) { h += '</ul>\n'; iL = false } if (l) { h += `<p>${l}</p>\n` } } }); if (iL) h += '</ul>\n'; return h.replace(/<p>\s*<\/p>/g, '').trim() }
function obtenerPrimerParrafo(t) { return obtenerPrimerosParrafos(t, 1)[0] || ''; }
function obtenerPrimerosParrafos(t, num) { if (!t) return []; const lineas = t.split('\n'); const parrafos = []; for (let l of lineas) { l = l.trim(); if (l && !l.startsWith('* ') && !l.startsWith('- ')) { parrafos.push(l.replace(/\*\*(.*?)\*\*/g, '$1').replace(/<b>(.*?)<\/b>/gi, '$1').replace(/<strong>(.*?)<\/strong>/gi, '$1')); if (parrafos.length >= num) break; } } return parrafos; }
function clearOutputs() { document.getElementById('output_filename').value = ''; document.getElementById('output_metatags').value = ''; document.getElementById('output_titulos').value = ''; document.getElementById('output_individual').value = ''; document.getElementById('output_index').value = ''; document.getElementById('output_additional_images').value = ''; document.getElementById('output-additional-images-group').classList.add('hidden'); }