// 全局变量
let originalImage = null;
let originalCanvas = null;
let originalCtx = null;
let processedCanvas = null;
let processedCtx = null;
let currentFiles = [];
let currentFilter = 'none';
let currentAdjustments = {
    brightness: 100,
    contrast: 100,
    saturation: 100
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    originalCanvas = document.getElementById('original-canvas');
    originalCtx = originalCanvas.getContext('2d');
    processedCanvas = document.getElementById('processed-canvas');
    processedCtx = processedCanvas.getContext('2d');
    
    // 设置Canvas图片平滑质量，保持清晰度
    originalCtx.imageSmoothingEnabled = true;
    originalCtx.imageSmoothingQuality = 'high';
    processedCtx.imageSmoothingEnabled = true;
    processedCtx.imageSmoothingQuality = 'high';
    
    setupUploadArea();
});

// 设置上传区域
function setupUploadArea() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('image-input');
    
    // 点击上传
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    // 文件选择
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

// 处理文件
function handleFiles(files) {
    if (files.length === 0) return;
    
    currentFiles = Array.from(files);
    
    if (files.length === 1) {
        // 单张图片处理
        loadImage(files[0]);
    } else {
        // 批量处理
        document.getElementById('batch-info').style.display = 'block';
        document.getElementById('file-count').textContent = files.length;
        document.getElementById('batch-section').style.display = 'block';
        showBatchPreview();
    }
}

// 加载单张图片
function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            
            // 保持原始尺寸，只限制最大显示尺寸（用于预览）
            // 但Canvas使用原始尺寸以保持清晰度
            const displayMaxWidth = 800;
            const displayMaxHeight = 600;
            let { width: displayWidth, height: displayHeight } = calculateAspectRatio(img.width, img.height, displayMaxWidth, displayMaxHeight);
            
            // Canvas使用原始尺寸以保持最高清晰度
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            processedCanvas.width = img.width;
            processedCanvas.height = img.height;
            
            // 重新设置图片平滑质量
            originalCtx.imageSmoothingEnabled = true;
            originalCtx.imageSmoothingQuality = 'high';
            processedCtx.imageSmoothingEnabled = true;
            processedCtx.imageSmoothingQuality = 'high';
            
            // 绘制原图（使用原始尺寸）
            originalCtx.drawImage(img, 0, 0);
            
            // 绘制处理后图片（初始状态，使用原始尺寸）
            processedCtx.drawImage(img, 0, 0);
            
            // 显示图片信息（显示原始尺寸）
            showImageInfo(originalCanvas, 'original-info', file);
            showImageInfo(processedCanvas, 'processed-info', file);
            
            // 显示编辑器
            document.getElementById('editor-section').style.display = 'block';
            document.getElementById('upload-area').style.display = 'none';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 计算宽高比
function calculateAspectRatio(imgWidth, imgHeight, maxWidth, maxHeight) {
    let width = imgWidth;
    let height = imgHeight;
    
    if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
    }
    
    if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
    }
    
    return { width, height };
}

// 显示图片信息
function showImageInfo(canvas, infoId, file) {
    const infoDiv = document.getElementById(infoId);
    const sizeKB = file ? (file.size / 1024).toFixed(2) : '0';
    const sizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : '0';
    
    infoDiv.innerHTML = `
        <strong>尺寸:</strong> ${canvas.width} × ${canvas.height} 像素<br>
        ${file ? `<strong>大小:</strong> ${sizeKB} KB (${sizeMB} MB)<br>` : ''}
        ${file ? `<strong>格式:</strong> ${file.type || '未知'}` : ''}
    `;
}

// 压缩图片
function compressImage() {
    if (!originalImage) return;
    
    const quality = 0.7; // 压缩质量
    processedCanvas.toBlob((blob) => {
        const originalSize = getCanvasSize(originalCanvas);
        const compressedSize = (blob.size / 1024).toFixed(2);
        const ratio = ((1 - blob.size / originalSize) * 100).toFixed(1);
        
        // 重新绘制压缩后的图片
        const img = new Image();
        img.onload = () => {
            processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
            processedCtx.drawImage(img, 0, 0, processedCanvas.width, processedCanvas.height);
            updateProcessedInfo(blob);
        };
        img.src = URL.createObjectURL(blob);
    }, 'image/jpeg', quality);
}

// 显示调整尺寸面板
function showResizePanel() {
    const modal = document.getElementById('resize-modal');
    const canvas = processedCanvas;
    
    document.getElementById('resize-width').value = canvas.width;
    document.getElementById('resize-height').value = canvas.height;
    
    modal.classList.add('show');
}

// 应用尺寸调整
function applyResize() {
    const width = parseInt(document.getElementById('resize-width').value);
    const height = parseInt(document.getElementById('resize-height').value);
    const maintainAspect = document.getElementById('maintain-aspect').checked;
    
    if (!width || !height) {
        alert('请输入有效的尺寸');
        return;
    }
    
    let newWidth = width;
    let newHeight = height;
    
    if (maintainAspect) {
        const aspectRatio = processedCanvas.width / processedCanvas.height;
        if (width / height > aspectRatio) {
            newWidth = height * aspectRatio;
        } else {
            newHeight = width / aspectRatio;
        }
    }
    
    // 创建新画布
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(processedCanvas, 0, 0, newWidth, newHeight);
    
    // 更新处理后的画布
    processedCanvas.width = newWidth;
    processedCanvas.height = newHeight;
    processedCtx.drawImage(tempCanvas, 0, 0);
    
    closeModal('resize-modal');
    updateProcessedInfo();
}

// 显示裁剪面板
function showCropPanel() {
    const modal = document.getElementById('crop-modal');
    const canvas = processedCanvas;
    
    document.getElementById('crop-width').value = Math.min(100, canvas.width);
    document.getElementById('crop-height').value = Math.min(100, canvas.height);
    
    modal.classList.add('show');
}

// 应用裁剪
function applyCrop() {
    const x = parseInt(document.getElementById('crop-x').value) || 0;
    const y = parseInt(document.getElementById('crop-y').value) || 0;
    const width = parseInt(document.getElementById('crop-width').value);
    const height = parseInt(document.getElementById('crop-height').value);
    
    if (!width || !height) {
        alert('请输入有效的裁剪尺寸');
        return;
    }
    
    // 确保不超出边界
    const maxX = Math.min(x + width, processedCanvas.width);
    const maxY = Math.min(y + height, processedCanvas.height);
    const actualWidth = maxX - x;
    const actualHeight = maxY - y;
    
    // 获取裁剪区域
    const imageData = processedCtx.getImageData(x, y, actualWidth, actualHeight);
    
    // 创建新画布
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = actualWidth;
    tempCanvas.height = actualHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.putImageData(imageData, 0, 0);
    
    // 更新处理后的画布
    processedCanvas.width = actualWidth;
    processedCanvas.height = actualHeight;
    processedCtx.drawImage(tempCanvas, 0, 0);
    
    closeModal('crop-modal');
    updateProcessedInfo();
}

// 旋转图片
function rotateImage(angle) {
    if (!originalImage) return;
    
    const canvas = processedCanvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // 如果是90度或-90度旋转，需要交换宽高
    const is90Degree = Math.abs(angle) === 90;
    const newWidth = is90Degree ? height : width;
    const newHeight = is90Degree ? width : height;
    
    // 创建临时画布
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 设置高质量渲染
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    
    // 旋转
    tempCtx.translate(newWidth / 2, newHeight / 2);
    tempCtx.rotate((angle * Math.PI) / 180);
    tempCtx.drawImage(canvas, -width / 2, -height / 2);
    
    // 更新画布
    processedCanvas.width = newWidth;
    processedCanvas.height = newHeight;
    processedCtx.imageSmoothingEnabled = true;
    processedCtx.imageSmoothingQuality = 'high';
    processedCtx.clearRect(0, 0, newWidth, newHeight);
    processedCtx.drawImage(tempCanvas, 0, 0);
    
    updateProcessedInfo();
}

// 翻转图片
function flipImage(direction) {
    if (!originalImage) return;
    
    const canvas = processedCanvas;
    const width = canvas.width;
    const height = canvas.height;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 设置高质量渲染
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    
    if (direction === 'horizontal') {
        tempCtx.translate(width, 0);
        tempCtx.scale(-1, 1);
    } else {
        tempCtx.translate(0, height);
        tempCtx.scale(1, -1);
    }
    
    tempCtx.drawImage(canvas, 0, 0);
    
    processedCtx.clearRect(0, 0, width, height);
    processedCtx.drawImage(tempCanvas, 0, 0);
    
    updateProcessedInfo();
}

// 应用滤镜（优化版本，使用批量处理和requestAnimationFrame）
function applyFilter(filterName) {
    currentFilter = filterName;
    
    if (!originalImage) return;
    
    // 使用CSS滤镜（更快）或Canvas处理
    if (filterName === 'none') {
        processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
        processedCtx.drawImage(originalCanvas, 0, 0);
        applyCurrentAdjustments();
        updateProcessedInfo();
        return;
    }
    
    // 重新绘制原图
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    processedCtx.drawImage(originalCanvas, 0, 0);
    
    // 使用requestAnimationFrame优化性能
    requestAnimationFrame(() => {
        applyFilterWithOptimization(filterName);
    });
}

// 显示进度条
function showProgress() {
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');
    
    progressContainer.style.display = 'block';
    progressBarFill.style.width = '0%';
    progressText.textContent = '处理中... 0%';
}

// 更新进度条
function updateProgress(percent) {
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');
    
    progressBarFill.style.width = percent + '%';
    progressText.textContent = `处理中... ${Math.round(percent)}%`;
}

// 隐藏进度条
function hideProgress() {
    const progressContainer = document.getElementById('progress-container');
    progressContainer.style.display = 'none';
}

// 优化的滤镜处理函数
function applyFilterWithOptimization(filterName) {
    const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
    const data = imageData.data;
    const length = data.length;
    
    // 显示进度条
    showProgress();
    
    // 批量处理，每次处理1000个像素
    const batchSize = 4000; // 每次处理1000个像素（4个值/像素）
    let offset = 0;
    
    function processBatch() {
        const end = Math.min(offset + batchSize, length);
        
        for (let i = offset; i < end; i += 4) {
            switch (filterName) {
                case 'grayscale':
                    // 增强黑白效果
                    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
                    data[i] = gray;
                    data[i + 1] = gray;
                    data[i + 2] = gray;
                    break;
                    
                case 'sepia':
                    // 增强怀旧效果
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    data[i] = Math.min(255, Math.round(r * 0.393 + g * 0.769 + b * 0.189));
                    data[i + 1] = Math.min(255, Math.round(r * 0.349 + g * 0.686 + b * 0.168));
                    data[i + 2] = Math.min(255, Math.round(r * 0.272 + g * 0.534 + b * 0.131));
                    break;
                    
                case 'invert':
                    data[i] = 255 - data[i];
                    data[i + 1] = 255 - data[i + 1];
                    data[i + 2] = 255 - data[i + 2];
                    break;
                    
                case 'blur':
                    // 简化模糊效果（避免复杂卷积）
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = Math.round(avg * 0.7 + data[i] * 0.3);
                    data[i + 1] = Math.round(avg * 0.7 + data[i + 1] * 0.3);
                    data[i + 2] = Math.round(avg * 0.7 + data[i + 2] * 0.3);
                    break;
                    
                case 'brightness':
                    // 增强亮度
                    data[i] = Math.min(255, Math.round(data[i] * 1.5));
                    data[i + 1] = Math.min(255, Math.round(data[i + 1] * 1.5));
                    data[i + 2] = Math.min(255, Math.round(data[i + 2] * 1.5));
                    break;
                    
                case 'contrast':
                    // 增强对比度
                    const factor = 1.5;
                    data[i] = Math.min(255, Math.max(0, Math.round((data[i] - 128) * factor + 128)));
                    data[i + 1] = Math.min(255, Math.max(0, Math.round((data[i + 1] - 128) * factor + 128)));
                    data[i + 2] = Math.min(255, Math.max(0, Math.round((data[i + 2] - 128) * factor + 128)));
                    break;
                    
                case 'saturate':
                    // 增强饱和度
                    const gray2 = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    const satFactor = 1.8;
                    data[i] = Math.min(255, Math.max(0, Math.round(gray2 + (data[i] - gray2) * satFactor)));
                    data[i + 1] = Math.min(255, Math.max(0, Math.round(gray2 + (data[i + 1] - gray2) * satFactor)));
                    data[i + 2] = Math.min(255, Math.max(0, Math.round(gray2 + (data[i + 2] - gray2) * satFactor)));
                    break;
            }
        }
        
        offset = end;
        
        // 更新进度
        const percent = (offset / length) * 100;
        updateProgress(percent);
        
        if (offset < length) {
            // 继续处理下一批
            requestAnimationFrame(processBatch);
        } else {
            // 处理完成，更新画布
            processedCtx.putImageData(imageData, 0, 0);
            
            // 隐藏进度条
            setTimeout(() => {
                hideProgress();
            }, 300);
            
            // 只有在调整值不是默认值时才应用调整
            if (currentAdjustments.brightness !== 100 || 
                currentAdjustments.contrast !== 100 || 
                currentAdjustments.saturation !== 100) {
                applyAdjustmentsOnly();
            } else {
                updateProcessedInfo();
            }
        }
    }
    
    processBatch();
}

// 调整亮度（带防抖，避免频繁更新）
let brightnessTimeout = null;
function adjustBrightness(value) {
    currentAdjustments.brightness = parseInt(value);
    document.getElementById('brightness-value').textContent = value + '%';
    
    // 清除之前的定时器
    if (brightnessTimeout) {
        clearTimeout(brightnessTimeout);
    }
    
    // 延迟执行，避免拖动时频繁更新
    brightnessTimeout = setTimeout(() => {
        applyCurrentAdjustments();
    }, 100);
}

// 调整对比度（带防抖）
let contrastTimeout = null;
function adjustContrast(value) {
    currentAdjustments.contrast = parseInt(value);
    document.getElementById('contrast-value').textContent = value + '%';
    
    if (contrastTimeout) {
        clearTimeout(contrastTimeout);
    }
    
    contrastTimeout = setTimeout(() => {
        applyCurrentAdjustments();
    }, 100);
}

// 调整饱和度（带防抖）
let saturationTimeout = null;
function adjustSaturation(value) {
    currentAdjustments.saturation = parseInt(value);
    document.getElementById('saturation-value').textContent = value + '%';
    
    if (saturationTimeout) {
        clearTimeout(saturationTimeout);
    }
    
    saturationTimeout = setTimeout(() => {
        applyCurrentAdjustments();
    }, 100);
}

// 应用当前调整（优化版本）
function applyCurrentAdjustments() {
    if (!originalImage) return;
    
    // 如果当前有滤镜，需要从原图重新开始
    if (currentFilter !== 'none') {
        // 重新绘制原图
        processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
        processedCtx.drawImage(originalCanvas, 0, 0);
        
        // 重新应用滤镜
        applyFilterWithOptimization(currentFilter);
        return;
    }
    
    // 从原图开始应用调整
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    processedCtx.drawImage(originalCanvas, 0, 0);
    applyAdjustmentsOnly();
}

// 仅应用调整（不重新应用滤镜）
function applyAdjustmentsOnly() {
    if (!originalImage) return;
    
    // 显示进度条
    showProgress();
    
    requestAnimationFrame(() => {
        const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
        const data = imageData.data;
        const length = data.length;
        
        const brightness = currentAdjustments.brightness / 100;
        const contrast = currentAdjustments.contrast / 100;
        const saturation = currentAdjustments.saturation / 100;
        
        // 批量处理
        const batchSize = 4000;
        let offset = 0;
        
        function processBatch() {
            const end = Math.min(offset + batchSize, length);
            
            for (let i = offset; i < end; i += 4) {
                // 亮度
                data[i] = Math.min(255, Math.max(0, Math.round(data[i] * brightness)));
                data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] * brightness)));
                data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] * brightness)));
                
                // 对比度
                const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
                data[i] = Math.min(255, Math.max(0, Math.round(factor * (data[i] - 128) + 128)));
                data[i + 1] = Math.min(255, Math.max(0, Math.round(factor * (data[i + 1] - 128) + 128)));
                data[i + 2] = Math.min(255, Math.max(0, Math.round(factor * (data[i + 2] - 128) + 128)));
                
                // 饱和度
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = Math.min(255, Math.max(0, Math.round(gray + (data[i] - gray) * saturation)));
                data[i + 1] = Math.min(255, Math.max(0, Math.round(gray + (data[i + 1] - gray) * saturation)));
                data[i + 2] = Math.min(255, Math.max(0, Math.round(gray + (data[i + 2] - gray) * saturation)));
            }
            
            offset = end;
            
            // 更新进度
            const percent = (offset / length) * 100;
            updateProgress(percent);
            
            if (offset < length) {
                requestAnimationFrame(processBatch);
            } else {
                processedCtx.putImageData(imageData, 0, 0);
                
                // 隐藏进度条
                setTimeout(() => {
                    hideProgress();
                }, 300);
                
                updateProcessedInfo();
            }
        }
        
        processBatch();
    });
}

// 显示格式转换面板
function showFormatPanel() {
    document.getElementById('format-modal').classList.add('show');
}

// 转换格式
function convertToFormat(format) {
    const mimeTypes = {
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif'
    };
    
    const mimeType = mimeTypes[format];
    if (!mimeType) return;
    
    processedCanvas.toBlob((blob) => {
        const img = new Image();
        img.onload = () => {
            processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
            processedCtx.drawImage(img, 0, 0, processedCanvas.width, processedCanvas.height);
            updateProcessedInfo(blob);
        };
        img.src = URL.createObjectURL(blob);
    }, mimeType, 0.9);
    
    closeModal('format-modal');
}

// 下载图片（保持高质量）
function downloadImage() {
    // 使用高质量设置下载
    processedCanvas.toBlob((blob) => {
        const link = document.createElement('a');
        link.download = `processed-image-${Date.now()}.jpg`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }, 'image/jpeg', 0.95); // 提高质量到0.95
}

// 重置图片
function resetImage() {
    if (!originalImage) return;
    
    processedCanvas.width = originalCanvas.width;
    processedCanvas.height = originalCanvas.height;
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    processedCtx.drawImage(originalCanvas, 0, 0);
    
    // 重置调整
    currentFilter = 'none';
    currentAdjustments = { brightness: 100, contrast: 100, saturation: 100 };
    document.getElementById('brightness-slider').value = 100;
    document.getElementById('contrast-slider').value = 100;
    document.getElementById('saturation-slider').value = 100;
    document.getElementById('brightness-value').textContent = '100%';
    document.getElementById('contrast-value').textContent = '100%';
    document.getElementById('saturation-value').textContent = '100%';
    
    updateProcessedInfo();
}

// 更新处理后图片信息
function updateProcessedInfo(blob) {
    if (blob) {
        const sizeKB = (blob.size / 1024).toFixed(2);
        const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
        document.getElementById('processed-info').innerHTML = `
            <strong>尺寸:</strong> ${processedCanvas.width} × ${processedCanvas.height} 像素<br>
            <strong>大小:</strong> ${sizeKB} KB (${sizeMB} MB)
        `;
    } else {
        showImageInfo(processedCanvas, 'processed-info');
    }
}

// 获取画布大小（字节）
function getCanvasSize(canvas) {
    return canvas.width * canvas.height * 4; // RGBA
}

// 关闭模态框
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// 点击模态框外部关闭
window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
};

// 批量处理预览
function showBatchPreview() {
    const resultsDiv = document.getElementById('batch-results');
    resultsDiv.innerHTML = '';
    
    currentFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'batch-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <p>${file.name}</p>
                <button onclick="processBatchItem(${index})">处理</button>
            `;
            resultsDiv.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

// 处理批量项目
function processBatchItem(index) {
    loadImage(currentFiles[index]);
}

// 批量压缩
async function batchCompress() {
    if (currentFiles.length === 0) return;
    
    const resultsDiv = document.getElementById('batch-results');
    resultsDiv.innerHTML = '<p>正在批量压缩...</p>';
    
    for (let i = 0; i < currentFiles.length; i++) {
        const file = currentFiles[i];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const link = document.createElement('a');
                    link.download = `compressed-${file.name}`;
                    link.href = URL.createObjectURL(blob);
                    
                    const div = document.createElement('div');
                    div.className = 'batch-item';
                    div.innerHTML = `
                        <img src="${link.href}" alt="${file.name}">
                        <p>${file.name}</p>
                        <button onclick="this.parentElement.querySelector('a').click()">下载</button>
                    `;
                    div.appendChild(link);
                    resultsDiv.appendChild(div);
                }, 'image/jpeg', 0.7);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// 批量调整尺寸
function batchResize() {
    const width = prompt('请输入目标宽度（像素）：', '800');
    const height = prompt('请输入目标高度（像素）：', '600');
    
    if (!width || !height) return;
    
    const resultsDiv = document.getElementById('batch-results');
    resultsDiv.innerHTML = '<p>正在批量调整尺寸...</p>';
    
    currentFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = parseInt(width);
                canvas.height = parseInt(height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob((blob) => {
                    const link = document.createElement('a');
                    link.download = `resized-${file.name}`;
                    link.href = URL.createObjectURL(blob);
                    
                    const div = document.createElement('div');
                    div.className = 'batch-item';
                    div.innerHTML = `
                        <img src="${link.href}" alt="${file.name}">
                        <p>${file.name}</p>
                        <button onclick="this.parentElement.querySelector('a').click()">下载</button>
                    `;
                    div.appendChild(link);
                    resultsDiv.appendChild(div);
                }, 'image/jpeg', 0.9);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 批量转换格式
function batchConvert() {
    const format = prompt('请输入目标格式（jpeg/png/webp）：', 'jpeg');
    if (!format) return;
    
    const mimeTypes = {
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp'
    };
    
    const mimeType = mimeTypes[format];
    if (!mimeType) {
        alert('不支持的格式');
        return;
    }
    
    const resultsDiv = document.getElementById('batch-results');
    resultsDiv.innerHTML = '<p>正在批量转换格式...</p>';
    
    currentFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const link = document.createElement('a');
                    link.download = file.name.replace(/\.[^/.]+$/, '') + '.' + format;
                    link.href = URL.createObjectURL(blob);
                    
                    const div = document.createElement('div');
                    div.className = 'batch-item';
                    div.innerHTML = `
                        <img src="${link.href}" alt="${file.name}">
                        <p>${file.name}</p>
                        <button onclick="this.parentElement.querySelector('a').click()">下载</button>
                    `;
                    div.appendChild(link);
                    resultsDiv.appendChild(div);
                }, mimeType, 0.9);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 重新选择图片
function reSelectImage() {
    // 隐藏编辑器
    document.getElementById('editor-section').style.display = 'none';
    
    // 显示上传区域
    document.getElementById('upload-area').style.display = 'block';
    
    // 重置状态
    originalImage = null;
    currentFiles = [];
    currentFilter = 'none';
    currentAdjustments = {
        brightness: 100,
        contrast: 100,
        saturation: 100
    };
    
    // 重置画布
    if (originalCanvas) {
        originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    }
    if (processedCanvas) {
        processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    }
    
    // 重置调整控件
    document.getElementById('brightness-slider').value = 100;
    document.getElementById('contrast-slider').value = 100;
    document.getElementById('saturation-slider').value = 100;
    document.getElementById('brightness-value').textContent = '100%';
    document.getElementById('contrast-value').textContent = '100%';
    document.getElementById('saturation-value').textContent = '100%';
    
    // 清空文件输入
    document.getElementById('image-input').value = '';
    
    // 隐藏批量处理区域
    document.getElementById('batch-section').style.display = 'none';
    document.getElementById('batch-info').style.display = 'none';
}

// 关于我们
function showAbout() {
    alert('图片处理工具 - 免费在线图片编辑\n\n我们提供专业的图片处理功能，包括压缩、裁剪、格式转换、滤镜效果等。\n\n完全免费使用，所有处理在本地完成，保护您的隐私。');
}