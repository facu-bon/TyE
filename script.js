let newsData = {};
let activeTabId = null;
let nextTabId = 1;
const BASE_URL = "https://www.transporteyenergia.com.ar";

// --- FUNCIONES DE UTILIDAD ---
function isValidUrl(string) {
    if (!string || typeof string !== 'string') return false;
    return string.startsWith('http://') || string.startsWith('https://');
}

function slugify(text) { 
    if (!text) return ''; 
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, 'n').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').substring(0, 70); 
}

function getActiveForm() { 
    return document.querySelector('.tab-content.active form'); 
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    setupGlobalListeners();
    addTab(); 
    
    window.addEventListener('beforeunload', (event) => {
        event.preventDefault();
        event.returnValue = '¿Estás seguro? Los datos no guardados se perderán.';
        return '¿Estás seguro? Los datos no guardados se perderán.';
    });
});

// --- GESTIÓN DE PESTAÑAS ---
function addTab() {
    saveCurrentTabData();
    
    let inheritedData = {
        imagen_principal_type: 'Transporte',
        modo_antonio_rossi: false,
        source_type: 'Fuente'
    };

    if (activeTabId && newsData[activeTabId]) {
        const prevData = newsData[activeTabId].data;
        if (prevData) {
            inheritedData.imagen_principal_type = prevData['imagen_principal_type'] || 'Transporte';
            inheritedData.modo_antonio_rossi = prevData['modo_antonio_rossi'] || false;
            inheritedData.source_type = prevData['source_type'] || 'Fuente';
        }
    }

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
    
    const rossiCb = clone.querySelector('input[name="modo_antonio_rossi"]');
    const rossiLabel = clone.querySelector('label[for="modo_antonio_rossi"]');
    if (rossiCb && rossiLabel) {
        const uniqueId = `modo_antonio_rossi_${tabId}`;
        rossiCb.id = uniqueId;
        rossiLabel.setAttribute('for', uniqueId);
    }

    const formContainer = document.createElement('div');
    formContainer.id = contentId;
    formContainer.className = 'tab-content';
    formContainer.appendChild(clone);
    
    document.getElementById('tab-content-container').appendChild(formContainer);
    
    const newForm = formContainer.querySelector('form');
    if (newForm) {
        const typeInput = newForm.querySelector('.image-group .image-type-selector');
        if (typeInput) typeInput.value = inheritedData.imagen_principal_type;
        
        const btns = newForm.querySelectorAll('.image-group .type-btn');
        btns.forEach(btn => {
            if (btn.dataset.value === inheritedData.imagen_principal_type) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Aplicar herencia de tipo de fuente
        const sourceTypeInput = newForm.querySelector('input[name="source_type"]');
        if (sourceTypeInput) sourceTypeInput.value = inheritedData.source_type;
        const sourceBtns = newForm.querySelectorAll('.source-type-controls .type-btn');
        sourceBtns.forEach(btn => {
            if (btn.dataset.value === inheritedData.source_type) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        
        autoUpdateFilename(newForm);
    }

    setupListenersForTab(formContainer);
    
    newsData[tabId] = { 
        id: tabId, 
        data: { ...inheritedData } 
    };

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
}

function closeTab(tabId) {
    const tabButton = document.getElementById(tabId); 
    const tabContent = document.getElementById(tabId.replace('tab-', 'content-')); 
    
    if (tabButton && tabContent) {
        const isActive = tabButton.classList.contains('active'); 
        tabButton.remove(); 
        tabContent.remove(); 
        delete newsData[tabId];
        
        if (isActive) {
            activeTabId = null; 
            const remainingKeys = Object.keys(newsData);
            if (remainingKeys.length > 0) { 
                const keysAsNumbers = remainingKeys.map(k => parseInt(k.replace('tab-','')));
                const maxKey = Math.max(...keysAsNumbers);
                switchTab(`tab-${maxKey}`);
            } else { 
                addTab(); 
            }
        }
        document.querySelectorAll('.tab-button').forEach((btn, index) => {
             const closeBtnHTML = btn.querySelector('.close-tab-btn')?.outerHTML || ''; 
             const cleanText = `Noticia ${index + 1} `;
             btn.innerHTML = cleanText + (closeBtnHTML || '');
        });
    }
}

// --- GESTIÓN DE DATOS ---
function saveCurrentTabData() {
    if (!activeTabId) return; 
    const form = getActiveForm(); 
    if (!form) return; 
    
    const dataObject = {}; 
    new FormData(form).forEach((value, key) => dataObject[key] = value); 
    
    const rossiCb = form.querySelector('input[name="modo_antonio_rossi"]');
    dataObject['modo_antonio_rossi'] = rossiCb ? rossiCb.checked : false;
    
    const filenameDisplay = form.querySelector('.filename-display');
    if(filenameDisplay) dataObject['currentFilename'] = filenameDisplay.value;

    dataObject.additionalImages = Array.from(form.querySelectorAll('.additional-image-field')).map(field => ({ 
        url: field.querySelector('.image-url')?.value || '', 
        type: field.querySelector('.image-type-selector')?.value || 'Transporte',
        filename: field.querySelector('.filename-display')?.value || ''
    }));
    
    newsData[activeTabId] = { id: activeTabId, data: dataObject };
}

function loadTabData(tabId) {
    const tabData = newsData[tabId]?.data || {}; 
    const form = getActiveForm(); 
    if (!form) return; 
    
    form.reset(); 
    form.querySelector('.additional-images-container').innerHTML = '';
    
    Object.keys(tabData).forEach(key => { 
        if (key !== 'additionalImages' && key !== 'currentFilename') { 
            const element = form.querySelector(`[name="${key}"]`); 
            if (element) { 
                if (element.type === 'checkbox') element.checked = !!tabData[key]; 
                else element.value = tabData[key] || ''; 
            } 
        } 
    });
    
    form.querySelectorAll('input[type="hidden"]').forEach(input => {
        const val = input.value;
        const group = input.closest('.type-buttons-group');
        if (group) {
            group.querySelectorAll('.type-btn').forEach(btn => {
                if(btn.dataset.value === val) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }
    });

    const rossiCb = form.querySelector('input[name="modo_antonio_rossi"]');
    if(rossiCb) handleRossiModeChange({target: rossiCb});

    if(tabData.currentFilename) {
        const fd = form.querySelector('.filename-display');
        if(fd) fd.value = tabData.currentFilename;
    } else {
        autoUpdateFilename(form);
    }

    if (tabData.additionalImages) { 
        tabData.additionalImages.forEach(img => addImageFieldDirect(form, img.url, img.type, img.filename)); 
    }
}

// --- LISTENERS ---
function setupGlobalListeners() {
    const tabContainer = document.getElementById('tab-buttons');
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeBtn.textContent = '☀️';
        }
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            themeBtn.textContent = isDark ? '☀️' : '🌙';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    const togglePreviewBtn = document.getElementById('toggle-preview-btn');
    const previewColumn = document.getElementById('preview-column');
    if (togglePreviewBtn && previewColumn) {
        togglePreviewBtn.addEventListener('click', () => {
            previewColumn.classList.toggle('minimized');
        });
    }
    
    tabContainer.addEventListener('click', (event) => {
        const closeBtn = event.target.closest('.close-tab-btn');
        if (closeBtn) {
            event.stopPropagation();
            const tabBtn = closeBtn.closest('.tab-button');
            if (tabBtn) closeTab(tabBtn.id);
            return;
        }
        const tabBtn = event.target.closest('.tab-button');
        if (tabBtn && !tabBtn.classList.contains('active')) {
            switchTab(tabBtn.id);
        }
    });

    document.getElementById('add-tab-btn').onclick = addTab;

    document.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.classList.contains('copy-btn') && button.hasAttribute('data-target')) {
            handleCopyClick(event);
        }
    });
    
    document.querySelector('.preview-tabs').addEventListener('click', (event) => {
        const button = event.target.closest('.preview-tab-btn'); if (!button) return; event.preventDefault();
        const isActive = button.classList.contains('active'); if (isActive) return;
        document.querySelectorAll('.preview-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.viewport-preview').forEach(vp => vp.classList.remove('active'));
        button.classList.add('active'); const targetId = button.getAttribute('data-target');
        const targetViewport = document.getElementById(targetId); if (targetViewport) targetViewport.classList.add('active');
        const isRossi = getActiveForm()?.querySelector('input[name="modo_antonio_rossi"]')?.checked || false;
        document.querySelectorAll('.preview-tab-btn.active').forEach(btn => btn.classList.toggle('rossi-mode', isRossi));
    });
}

function setupListenersForTab(formContainer) {
    formContainer.addEventListener('click', function (event) {
        const target = event.target.closest('button');
        if (!target) return;

        if (target.classList.contains('type-btn')) {
            handleTypeButtonClick(target);
            return; 
        }

        const isCopyBtn = target.classList.contains('copy-btn') || target.classList.contains('copy-filename-btn');
        if (!isCopyBtn) event.preventDefault();

        if (target.classList.contains('copy-filename-btn')) handleCopyClick(event);
        else if (target.classList.contains('copy-image-btn')) handleCopyImageClick(event);
        else if (target.classList.contains('increment-btn')) handleIncrementClick(event);
        else if (target.classList.contains('add-btn')) addImageField(target);
        else if (target.classList.contains('remove-btn')) removeImageField(target.closest('.additional-image-field'));
        else if (target.classList.contains('btn-bold')) handleFormatBold(event);
        else if (target.classList.contains('btn-list')) handleFormatList(event);
        else if (target.classList.contains('main-btn')) generarCodigo();
    });

    formContainer.querySelectorAll('.image-url').forEach(i => {
        i.addEventListener('input', updateImagePreviewHandler, { passive: true });
        i.addEventListener('change', updateImagePreviewHandler);
        updateImagePreview(i);
    });

    const rossiCheckbox = formContainer.querySelector('input[name="modo_antonio_rossi"]');
    if (rossiCheckbox) {
        rossiCheckbox.addEventListener('change', (event) => {
            handleRossiModeChange(event);
            const form = formContainer.querySelector('form');
            autoUpdateFilename(form);
            form.querySelectorAll('.additional-image-field').forEach(field => {
                autoUpdateAdditionalFilename(field, form);
            });
        });
    }
}

function handleRossiModeChange(event) {
    const isChecked = event.target.checked;
    const form = event.target.closest('form');
    const container = event.target.closest('.container');
    
    if (container) { container.classList.toggle('rossi-mode', isChecked); }
    document.querySelectorAll('.preview-tab-btn.active').forEach(btn => btn.classList.toggle('rossi-mode', isChecked));

    if(form) {
        const sourceButtons = form.querySelector('.source-type-controls');
        if(sourceButtons) {
            if(isChecked) sourceButtons.classList.remove('hidden');
            else sourceButtons.classList.add('hidden');
        }
    }
}

function handleTypeButtonClick(button) {
    const group = button.closest('.type-buttons-group');
    const hiddenInput = group.querySelector('input[type="hidden"]');
    const newValue = button.dataset.value;

    hiddenInput.value = newValue;
    group.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const form = button.closest('form');
    
    if (group.closest('.image-group')) {
        autoUpdateFilename(form);
    } else if (group.closest('.additional-image-field')) {
        autoUpdateAdditionalFilename(group.closest('.additional-image-field'), form);
    }
}

function autoUpdateFilename(form) {
    if (!form) return;
    const rossiCheckbox = form.querySelector('input[name="modo_antonio_rossi"]');
    const typeInput = form.querySelector('.image-group .image-type-selector');
    const filenameDisplay = form.querySelector('.image-group .filename-display');

    if (!filenameDisplay) return;

    let tipo = 'Transporte'; 
    if (rossiCheckbox && rossiCheckbox.checked) {
        tipo = 'AR';
    } else if (typeInput) {
        tipo = typeInput.value;
    }

    const hoy = new Date();
    const fechaArchivo = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
    const nextIndex = getNextAvailableIndex(tipo, fechaArchivo);
    
    filenameDisplay.value = `${fechaArchivo}-${tipo}${nextIndex.toString().padStart(3, '0')}.jpg`;
}

function autoUpdateAdditionalFilename(fieldWrapper, form) {
    const rossiCheckbox = form.querySelector('input[name="modo_antonio_rossi"]');
    const typeInput = fieldWrapper.querySelector('.image-type-selector');
    const filenameDisplay = fieldWrapper.querySelector('.filename-display');
    if (!filenameDisplay) return;

    let tipo = 'Transporte';
    if (rossiCheckbox && rossiCheckbox.checked) {
        tipo = 'AR';
    } else if (typeInput) {
        tipo = typeInput.value;
    }

    const hoy = new Date();
    const fechaArchivo = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
    const nextIndex = getNextAvailableIndex(tipo, fechaArchivo);
    filenameDisplay.value = `${fechaArchivo}-${tipo}${nextIndex.toString().padStart(3, '0')}.jpg`;
}

function getNextAvailableIndex(tipo, fecha) {
    let maxIndex = 0;
    document.querySelectorAll('.filename-display').forEach(input => {
        if (input.value) {
            const pattern = `${fecha}-${tipo}(\\d{3})\\.jpg`;
            const regex = new RegExp(pattern);
            const match = input.value.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxIndex) maxIndex = num;
            }
        }
    });
    return maxIndex + 1;
}

// --- GENERACIÓN DE CÓDIGO ---
function generarCodigo() {
    saveCurrentTabData();
    const currentData = newsData[activeTabId]?.data;
    if (!currentData) { alert("Error: No se encontraron datos."); return; }
    
    const { titulo = '', imagen_principal = '', body = '', modo_antonio_rossi = false, bajada = '', imagen_principal_type = 'Transporte', epigrafe = '', fuente = '', additionalImages = [] } = currentData;
    
    const form = getActiveForm();
    const sourceTypeInput = form.querySelector('input[name="source_type"]');
    const sourceType = sourceTypeInput ? sourceTypeInput.value : 'Fuente'; 

    if (!titulo || !body) { alert("Completa Título y Cuerpo."); return; }
    
    const hoy = new Date(); const anio = hoy.getFullYear(); const mes = (hoy.getMonth() + 1).toString().padStart(2, '0'); const dia = hoy.getDate().toString().padStart(2, '0'); const fechaSidebar = `${dia}/${mes}/${anio.toString().substr(-2)}`; const fechaArchivo = `${anio}-${mes}-${dia}`; const fechaListaTitulos = `${dia}.${mes}.${anio.toString().substr(-2)}`; const slug = slugify(titulo);
    
    const filenameInputPrincipal = form.querySelector('.image-group .filename-display');
    let imgFilenamePrincipal = filenameInputPrincipal?.value;
    if (!imgFilenamePrincipal) {
        autoUpdateFilename(form);
        imgFilenamePrincipal = filenameInputPrincipal?.value;
    }

    let filename, urlIndividual, urlIndex, imgPathIndex, carpetaIndex, imgPathIndividual, urlTitulosRossi, canonicalUrl, imgPathIndexFull;
    if (modo_antonio_rossi) {
        filename = `${slug}.html`; urlIndex = `Antonio-Rossi/${anio}/${filename}`; urlIndividual = `../../${urlIndex}`; urlTitulosRossi = `../../Antonio-Rossi/${anio}/${filename}`; carpetaIndex = 'Imagenes/ImgAntonio/'; imgPathIndividual = imgFilenamePrincipal ? `../../../${carpetaIndex}${imgFilenamePrincipal}` : ''; imgPathIndex = imgFilenamePrincipal ? (carpetaIndex + imgFilenamePrincipal) : '';
    } else {
        filename = `${slug}.html`; urlIndex = `Noticias-${anio}${mes}/${filename}`;
        urlIndividual = `../../${urlIndex}`; carpetaIndex = 'Imagenes/';
        imgPathIndividual = imgFilenamePrincipal ? `../../${carpetaIndex}${imgFilenamePrincipal}` : '';
        imgPathIndex = imgFilenamePrincipal ? (carpetaIndex + imgFilenamePrincipal) : '';
    }
    canonicalUrl = `${BASE_URL}/Noticias/${urlIndex}`;
    imgPathIndexFull = imgPathIndex ? `${BASE_URL}/${imgPathIndex}` : '';
    const bodyProcesado = procesarCuerpo(body);

    const outputFilenameEl = form.querySelector('[id="output_filename"]'); 
    if (outputFilenameEl) outputFilenameEl.value = filename;
    
    const metaTitle = titulo.replace(/"/g, '“'); 
    let htmlMetaTags = '';
    if (imgPathIndexFull) htmlMetaTags += `<meta property="og:image" content="${imgPathIndexFull}"/>\n`;
    htmlMetaTags += `<link rel="canonical" href="${canonicalUrl}"/>\n`; 
    htmlMetaTags += `<meta property="og:title" content="${metaTitle} - Transporte y Energia "/>\n`; 
    htmlMetaTags += `<meta property="og:url" content="${canonicalUrl}"/>\n`; 
    htmlMetaTags += `<meta property="og:site_name" content="TransporteyEnergia" />`;

    const outputMetatagsEl = form.querySelector('[id="output_metatags"]');
    if (outputMetatagsEl) outputMetatagsEl.value = htmlMetaTags;

    // Generar cuerpo individual parcial
    let htmlIndividual = '';
    htmlIndividual += `<h4><span class="sidebar">${fechaSidebar}</span><br/></h4>\n`;
    htmlIndividual += `<Titulo>${titulo}</Titulo><br /><br />\n`;
    if (bajada || modo_antonio_rossi) { htmlIndividual += `<Bajada>${bajada || ''}`; if (modo_antonio_rossi) { htmlIndividual += `<br/><br/>Por Antonio Rossi `; } htmlIndividual += `</Bajada><br/><br/>\n`; }
    if (imgPathIndividual) { htmlIndividual += `<img src="${imgPathIndividual}" style="width:100%"/><br/>\n`; htmlIndividual += `<pie>${epigrafe || ''}</pie><br/>\n\n`; }
    htmlIndividual += `${bodyProcesado}\n\n`; 
    
    let htmlAdditionalImagesOutput = '', htmlAdditionalImagesIndividual = ''; 
    form.querySelectorAll('.additional-image-field').forEach(field => { 
        const url = field.querySelector('.image-url').value; 
        const type = field.querySelector('.image-type-selector').value; 
        const filenameInputAdicional = field.querySelector('.filename-display'); 
        if (!url) return; 
        
        let imgFilenameAdicional = filenameInputAdicional?.value; 
        if (!imgFilenameAdicional) { 
            autoUpdateAdditionalFilename(field, form);
            imgFilenameAdicional = filenameInputAdicional.value;
        } 
        
        const tipoImg = modo_antonio_rossi ? 'AR' : type; 
        const carpetaIndexAdicional = tipoImg === 'AR' ? 'Imagenes/ImgAntonio/' : 'Imagenes/'; 
        const imgPathIndividualAdicional = (modo_antonio_rossi ? '../../../' : '../../') + carpetaIndexAdicional + imgFilenameAdicional; 
        const imgPathIndexAdicional = carpetaIndexAdicional + imgFilenameAdicional; 
        htmlAdditionalImagesIndividual += `<p><img src="${imgPathIndividualAdicional}" style="width:100%"/></p>\n`; 
        htmlAdditionalImagesOutput += `<p><img src="${imgPathIndexAdicional}" style="width:100%"/></p>\n\n`; 
    });
    
    if (htmlAdditionalImagesIndividual) htmlIndividual += htmlAdditionalImagesIndividual; 
    
    if (fuente) {
        if (modo_antonio_rossi && sourceType === 'Nota editada en') {
            htmlIndividual += `<p>Nota editada en ${fuente}</p>\n`;
        } else {
            htmlIndividual += `<p>Fuente: ${fuente}</p>\n`;
        }
    }
    
    const htmlPaginaCompleta = construirPaginaCompleta(titulo, htmlMetaTags, htmlIndividual, modo_antonio_rossi);
    
    const outputIndividual = form.querySelector('[id="output_individual"]');
    if (outputIndividual) {
        outputIndividual.value = htmlPaginaCompleta;
    }

    const additionalOutputGroup = form.querySelector('[id="output-additional-images-group"]');
    const outputAdditionalImagesEl = form.querySelector('[id="output_additional_images"]');

    if (additionalOutputGroup && outputAdditionalImagesEl) { 
        if (htmlAdditionalImagesOutput) { 
            additionalOutputGroup.classList.remove('hidden'); 
            outputAdditionalImagesEl.value = htmlAdditionalImagesOutput.trim(); 
        } else { 
            additionalOutputGroup.classList.add('hidden'); 
            outputAdditionalImagesEl.value = ''; 
        } 
    }

    let htmlTitulos = ''; if (modo_antonio_rossi) { htmlTitulos = `<li><dd><a href="${urlTitulosRossi}">${fechaListaTitulos} - ${titulo} </a></dd></li>`; } else { htmlTitulos = `<li><dd><a href="${urlIndividual}">\n ${fechaListaTitulos} - ${titulo}</a></dd></li>`; } 
    const outputTitulosEl = form.querySelector('[id="output_titulos"]');
    if (outputTitulosEl) outputTitulosEl.value = htmlTitulos;

    let htmlIndex = ''; if (modo_antonio_rossi) { htmlIndex = `<div id="seComenta"> <div id="NotaAntonio"><br />\n<a href="Noticias/${urlIndex}">\n<Titulo>${titulo}</Titulo><br /><br />\n`; if (imgPathIndex) htmlIndex += `<img src="${imgPathIndex}" style="width:100%"/><br/>\n`; const parrafos = bajada ? [bajada, ...obtenerPrimerosParrafos(body, 2)] : obtenerPrimerosParrafos(body, 2); if (parrafos.length > 0) htmlIndex += parrafos.map(p => `<p>${p}</p>`).join('\n') + '\n'; htmlIndex += `</a></div></div>`; } else { htmlIndex = `<div class="SubColumna" id="SubColumna"><br />\n<a href="Noticias/${urlIndex}">\n<Titulo>${titulo}</Titulo><br /><br />\n`; if (bajada) htmlIndex += `<Bajada>${bajada}</Bajada><br/><br/>\n`; if (imgPathIndex) { htmlIndex += `<div id="fotoInicio"><img src="${imgPathIndex}" style="width:100%"/>\n`; if (epigrafe) htmlIndex += `<div id="epigrafe"><pie>${epigrafe}</pie></div>\n`; htmlIndex += `</div>`; } htmlIndex += `</a><p> </p><img src="Imagenes/Galeria/separacion_columna.jpg" width="480" /> </div>`; } 
    const outputIndexEl = form.querySelector('[id="output_index"]');
    if (outputIndexEl) outputIndexEl.value = htmlIndex.trim();
    
    updateViewportPreview(document.getElementById('viewport-preview-individual'), htmlIndividual, modo_antonio_rossi, false);
    updateViewportPreview(document.getElementById('viewport-preview-index'), htmlIndex, modo_antonio_rossi, true);
}

// --- FUNCIÓN DE PLANTILLA COMPLETA CORREGIDA (RUTAS RELATIVAS) ---
function construirPaginaCompleta(titulo, metaTags, contenidoBody, esModoRossi) {
    // 1. Plantilla ORIGINAL de Dreamweaver con rutas locales
    let template = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Titulo</title>

<script type="text/jscript">
img1 = new Image(); 
img1.src = "../../../../Imagenes/Costera_2.jpg"; 
img2 = new Image(); 
img2.src = "../../../../Imagenes/Costera.jpg";

function cambia(nombre,imagen) {
nombre.src = imagen.src 
}
</script>

<script language="javascript" type="text/javascript">
var hoy = new Date() 
dias = new Array("Domingo", "Lunes", "Martes", "Miércoles", "Jueves","Viernes", "Sabado"); 
meses = new Array ("Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre");
var anio= hoy.getFullYear()
fecha=(dias[hoy.getDay()]+ ", " +hoy.getDate() +" de " + meses[hoy.getMonth()]+" de " + anio) 
</script>


<script src="file:///C|/TyE/SpryAssets/SpryMenuBar.js" type="text/javascript"></script>
<link href="file:///C|/TyE/SpryAssets/SpryMenuBarHorizontal.css" rel="stylesheet" type="text/css" />
<link href="file:///C|/TyE/SpryAssets/SpryMenuBarPrincipal.css" rel="stylesheet" type="text/css" />
<link href="file:///C|/TyE/CSS/TyE.css" rel="stylesheet" type="text/css" />
<link rel="shortcut icon" href="file:///C|/TyE/Imagenes/Galeria/favicon.ico" />

<script src="file:///C|/TyE/Scripts/AC_RunActiveContent.js" type="text/javascript"></script>
<style type="text/css">
</style>
</head> 

<body class="thrCol">


<div id="container">
<div id="header">
        <h1>Energia y Transporte</h1>
        <div align="left"><a href="file:///C|/TyE/index.html"><img src="file:///C|/TyE/Imagenes/Galeria/cabecera-azul.png" alt="cabecera" name="Image1" width="1007" height="151" align="middle" id="Image1" /></a> </div>
   
   <div class="enCabecera" id="apDiv2"> Portal de Noticias</div>

   <div class="enCabecera" id="apDiv1"> 
    <script language="JavaScript" type="text/javascript"> 
        document.write(fecha);</script></div>

<div class="enCabecera" id="linkTwit" ><a href="https://twitter.com/AntonioA_Rossi" target="_blank"><img src="file:///C|/TyE/Imagenes/Galeria/LogoX.png" width="25" height="25"></a> </div>
  <div class="enCabecera" id="linkInstagram" ><a href=" https://www.instagram.com/antonio.a.rossi/?hl=es-la" target="_blank"><img src="file:///C|/TyE/Imagenes/Galeria/LogoInstagram.png" alt="{texto del alt}" width="25" height="25"></a> </div>
   <div class="enCabecera" id="linkFb" ><a href="https://www.facebook.com/Transporte-y-Energ%C3%ADa-1800529253509123/?fref=ts &title=Transporte y Energía" target="_blank"><img src="file:///C|/TyE/Imagenes/Galeria/FB.png"  width="25" height="25"></a> </div>
 
<div class="enCabecera" id="lateralDerechoCabecera" >
Información actualizada <br />
de dos sectores claves para el país    </div>


 
   <div id="MenuPpal">

      <ul id="MenuBarPpal" class="MenuBarPrincipal">
       <li><a href="file:///C|/TyE/index.html">Home</a> </li>
        <li><a href="file:///C|/TyE/Noticias/del%20Dia/Titulos/Antonio-Rossi.html">Análisis </a></li>
        <li><a href="file:///C|/TyE/Noticias/Globales/contacto.html">Contacto</a></li> 
    </ul>
 
</div>
      </div>
  <div id="mainContent">
  
      <div id="menuTteNotCompleta">
            
      <h3 class="title">TRANSPORTE</h3>
      <ul id="MenuTransporte" class="MenuBarHorizontal">
        <li><a href="file:///C|/TyE/Noticias/del%20Dia/Titulos/Aereo.html">Aerocomercial</a> </li>
        <li><a href="file:///C|/TyE/Noticias/del%20Dia/Titulos/Automotor.html">Automotor</a></li>
        <li><a href="file:///C|/TyE/Noticias/del%20Dia/Titulos/Ferroviario.html">Ferroviario</a> </li>
        <li><a href="file:///C|/TyE/Noticias/del%20Dia/Titulos/Maritimo.html">Mar&iacute;timo</a></li>
      </ul>
    </div>
    
    <div id="menuEgiaNotCompleta">
          <h3 class="title" >ENERGÍA</h3>
      <ul id="MenuEnergia" class="MenuBarHorizontal">
        <li><a href="file:///C|/TyE/Noticias/del%20Dia/Titulos/Electrica.html">Eléctrica</a> </li>
        <li><a href="file:///C|/TyE/Noticias/del%20Dia/Titulos/Gas.html">Gas</a></li>
        <li><a href="file:///C|/TyE/Noticias/del%20Dia/Titulos/Petroleo.html">Petróleo</a> </li>
        <li><a href="file:///C|/TyE/Noticias/del%20Dia/Titulos/Renovable.html">Renovables</a></li>
      </ul>
      </div>
    <div id="ColumnaCentral2">
      <div id="NoticiaCompleta2"><p>&nbsp;</p>
   
   
   </div>
    </div>
    
    </div>
    
<div id="footer">
      <div class="thrCol" id="logoeditor"><img src="file:///C|/TyE/Imagenes/Galeria/LogoRoxe5.jpg" alt="Logo" width="310" height="79" /></div>
    <div id="piePagIzq">    Edición: Roxe Comunicaciones SRL<br />
                            Bolivar 1787 - 6° E CABA<br />
                            Tel: +54 11 4300-2416
                            info@transporteyenergia.com.ar<br />
    </div>

<div class="thrCol" id="piePagDer"> <strong style="font-size: 24px">Transporte y Energía</strong><br />
                                        Portal de noticias con información actualizada <br />
                                        de dos sectores claves para el país</div>
    </div>

   </div>
  <br class="clearfloat" />

</div>
<script type="text/javascript">
</script> 
</body>
</html>`;

    // 2. Definir el prefijo correcto (../../ para Normal, ../../../ para Rossi)
    const prefix = esModoRossi ? '../../../' : '../../';

    // 3. REEMPLAZO INTELIGENTE: Cambiar todas las rutas locales por la relativa correcta
    // Reemplaza "file:///C|/TyE/" por el prefijo
    template = template.replace(/file:\/\/\/C\|\/TyE\//g, prefix);
    
    // Reemplaza las rutas del script de Costera que tenían muchos niveles
    // Busca "../../../../Imagenes/" y lo deja como "prefix + Imagenes/"
    template = template.replace(/"\.\.\/\.\.\/\.\.\/\.\.\/Imagenes\//g, `"${prefix}Imagenes/`);

    // Inserción de datos
    template = template.replace('<title>Titulo</title>', metaTags);
    template = template.replace('<p>&nbsp;</p>', contenidoBody);

    return template;
}

// --- HELPERS MENORES ---
function handleCopyClick(event) {
    event.preventDefault(); 
    const button = event.target.closest('button'); 
    if (!button) return; 
    
    let targetElement;
    
    if (button.classList.contains('copy-filename-btn')) { 
        targetElement = button.closest('.filename-display-group').querySelector('.filename-display'); 
    }
    else { 
        const targetId = button.getAttribute('data-target');
        const form = button.closest('form');
        targetElement = form.querySelector(`[id="${targetId}"]`); 
    }
    
    copyToClipboard(targetElement, button);
}

async function handleCopyImageClick(event) {
    event.preventDefault(); const button = event.target.closest('button'); if (!button) return;
    const wrapper = button.closest('.image-group, .additional-image-field'); const urlInput = wrapper?.querySelector('.image-url'); const url = urlInput?.value;
    if (!url || !isValidUrl(url)) { alert("La URL de la imagen no es válida."); return; }
    showCopyFeedback(button, "Copiando...");
    try {
        const response = await fetch(url); if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        const blob = await response.blob(); await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        showCopyFeedback(button, "¡Imagen Copiada!");
    } catch (err) { console.error("Error copia:", err); alert("Error al copiar imagen (Posible bloqueo CORS). Intenta abrir la imagen y copiarla manualmente."); showCopyFeedback(button, "Error"); }
}

function updateImagePreviewHandler(event) { updateImagePreview(event.target); }
function handleIncrementClick(event) { event.preventDefault(); const button = event.target.closest('button'); if (!button) return; const direction = parseInt(button.dataset.direction); changeImageIndex(button, direction); }

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

function copyToClipboard(element, button) { if (!button || !element || typeof element.value === 'undefined') { return; } const textToCopy = element.value; if (!textToCopy) { return; } if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(textToCopy).then(() => { showCopyFeedback(button); }).catch(err => { copyUsingExecCommand(textToCopy, button); }); } else { copyUsingExecCommand(textToCopy, button); } }
function copyUsingExecCommand(text, button) { const tempTextArea = document.createElement('textarea'); tempTextArea.value = text; tempTextArea.style.position = 'absolute'; tempTextArea.style.left = '-9999px'; document.body.appendChild(tempTextArea); tempTextArea.select(); tempTextArea.setSelectionRange(0, 99999); try { const successful = document.execCommand('copy'); if (successful) { showCopyFeedback(button); } else { alert('No se pudo copiar el texto.'); } } catch (err) { alert('No se pudo copiar el texto.'); } document.body.removeChild(tempTextArea); }
function showCopyFeedback(button, text = '¡Copiado!') { if (!button) return; const originalText = button.textContent; button.textContent = text; button.classList.add('copied'); setTimeout(() => { button.textContent = originalText; button.classList.remove('copied'); }, 1500); }
function updateImagePreview(inputEl) { if (!inputEl) return; const group = inputEl.closest('.image-group, .additional-image-field'); if (!group) return; const feedback = group.querySelector('.image-input-feedback'); if (!feedback) return; const previewImg = feedback.querySelector('.image-preview'); const placeholder = feedback.querySelector('.preview-placeholder'); if (!previewImg || !placeholder) return; const url = inputEl.value.trim(); if (isValidUrl(url)) { previewImg.src = url; previewImg.classList.remove('hidden'); placeholder.classList.add('hidden'); previewImg.onerror = () => { previewImg.classList.add('hidden'); placeholder.classList.remove('hidden'); placeholder.textContent = "Error URL"; }; } else { previewImg.classList.add('hidden'); placeholder.classList.remove('hidden'); placeholder.textContent = "Vista Previa"; previewImg.src = "#"; } }

function addImageField(button) { const form = button.closest('form'); addImageFieldDirect(form); }
function addImageFieldDirect(form, url = '', type = 'Transporte', filename = '') {
    const container = form.querySelector('.additional-images-container'); if (!container) return;
    const fieldWrapper = document.createElement('div'); fieldWrapper.className = 'additional-image-field';
    
    // NOTA: USAMOS EL NUEVO GRUPO DE BOTONES PARA IMÁGENES ADICIONALES
    fieldWrapper.innerHTML = `
        <div class="image-input-controls"> 
            <div class="type-buttons-group">
                <input type="hidden" class="image-type-selector" name="imagen_adicional_type_${container.children.length}" value="${type}">
                <button type="button" class="type-btn ${type === 'Transporte' ? 'active' : ''}" data-value="Transporte">Transporte</button>
                <button type="button" class="type-btn ${type === 'Energia' ? 'active' : ''}" data-value="Energia">Energía</button>
                <button type="button" class="type-btn ${type === 'AR' ? 'active' : ''}" data-value="AR">Rossi</button>
            </div>
            <input type="url" class="image-url" name="imagen_adicional_url_${container.children.length}" placeholder="https://..."> 
        </div>
        <div class="image-input-feedback"> <div class="image-preview-container"> <img src="#" alt="Vista previa adicional" class="image-preview hidden"> <span class="preview-placeholder">Vista Previa</span> </div> <div class="filename-display-group"> <label>Nombre Sugerido:</label> <div class="filename-controls"> <input type="text" class="filename-display" readonly> <button type="button" class="increment-btn" data-direction="-1">-</button> <button type="button" class="increment-btn" data-direction="1">+</button> </div> <button type="button" class="copy-btn copy-filename-btn">Copiar Nombre</button> <button type="button" class="copy-btn copy-image-btn">Copiar Imagen</button> </div> </div>
        <button type="button" class="remove-btn">Eliminar</button> `;
    container.appendChild(fieldWrapper);
    const newUrlInput = fieldWrapper.querySelector('.image-url');
    const newFilename = fieldWrapper.querySelector('.filename-display');
    
    newUrlInput.value = url;
    if(filename) newFilename.value = filename;
    
    newUrlInput.addEventListener('input', updateImagePreviewHandler);
    newUrlInput.addEventListener('change', updateImagePreviewHandler);
    
    fieldWrapper.querySelector('.remove-btn').onclick = () => removeImageField(fieldWrapper);
    updateImagePreview(newUrlInput);
    
    if(!filename) autoUpdateAdditionalFilename(fieldWrapper, form);
}
function removeImageField(fieldWrapper) { fieldWrapper.remove(); const activeForm = getActiveForm(); if (activeForm && activeForm.querySelectorAll('.additional-image-field').length === 0) { document.getElementById('output-additional-images-group')?.classList.add('hidden'); } }
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
function clearOutputs() { 
    const form = getActiveForm();
    if (!form) return;
    const clear = (selector) => { const el = form.querySelector(selector); if (el) el.value = ''; };
    clear('[id="output_filename"]');
    clear('[id="output_individual"]');
    clear('[id="output_titulos"]');
    clear('[id="output_index"]');
    clear('[id="output_additional_images"]');
    const group = form.querySelector('[id="output-additional-images-group"]');
    if (group) group.classList.add('hidden');
}