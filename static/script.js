document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    
    const placeholderResult = document.getElementById('placeholder-result');
    const loadingResult = document.getElementById('loading-result');
    const actualResult = document.getElementById('actual-result');
    
    const resultClass = document.getElementById('result-class');
    const resultConfidence = document.getElementById('result-confidence');
    const confidenceFill = document.getElementById('confidence-fill');
    const breakdownList = document.getElementById('breakdown-list');

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    
    // Check for saved theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }

    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    });

    let selectedFile = null;

    // Trigger file input
    dropZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        handleFiles(dt.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            selectedFile = files[0];
            if (selectedFile.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    dropZone.classList.add('hidden');
                    previewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(selectedFile);
            } else {
                alert('Please upload an image file.');
            }
        }
    }

    removeBtn.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        dropZone.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        resetResults();
    });

    function resetResults() {
        placeholderResult.classList.remove('hidden');
        loadingResult.classList.add('hidden');
        actualResult.classList.add('hidden');
    }

    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // UI state: loading
        placeholderResult.classList.add('hidden');
        loadingResult.classList.remove('hidden');
        actualResult.classList.add('hidden');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Prediction failed');

            const data = await response.json();
            displayResults(data);
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during analysis. Please try again.');
            resetResults();
        }
    });

    function displayResults(data) {
        loadingResult.classList.add('hidden');
        actualResult.classList.remove('hidden');

        resultClass.textContent = `${data.class} Detected`;
        const confidencePct = (data.confidence * 100).toFixed(1) + '%';
        resultConfidence.textContent = confidencePct;
        confidenceFill.style.width = confidencePct;

        // Breakdown list
        breakdownList.innerHTML = '';
        const sortedLabels = Object.keys(data.all_predictions).sort((a, b) => data.all_predictions[b] - data.all_predictions[a]);
        
        sortedLabels.forEach(label => {
            const val = (data.all_predictions[label] * 100).toFixed(2);
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            item.innerHTML = `
                <span>${label}</span>
                <span>${val}%</span>
            `;
            breakdownList.appendChild(item);
        });

        // Add to history
        addToHistory(data.class, data.confidence, imagePreview.src);
    }

    const historyGrid = document.getElementById('history-grid');
    const noHistoryMsg = document.getElementById('no-history');

    function addToHistory(className, confidence, imgSrc) {
        const history = JSON.parse(localStorage.getItem('scanHistory') || '[]');
        const newEntry = {
            id: Date.now(),
            class: className,
            confidence: (confidence * 100).toFixed(1),
            img: imgSrc,
            date: new Date().toLocaleTimeString()
        };
        
        history.unshift(newEntry);
        // Keep only last 10
        if (history.length > 10) history.pop();
        
        localStorage.setItem('scanHistory', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        const history = JSON.parse(localStorage.getItem('scanHistory') || '[]');
        
        if (history.length === 0) {
            noHistoryMsg.classList.remove('hidden');
            return;
        }

        noHistoryMsg.classList.add('hidden');
        const existingCards = historyGrid.querySelectorAll('.history-card');
        existingCards.forEach(card => card.remove());

        history.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'history-card';
            const statusClass = entry.class === 'No Tumor' ? 'status-positive' : 'status-warning';
            
            card.innerHTML = `
                <img src="${entry.img}" class="history-thumb" alt="History Image">
                <div class="history-info">
                    <h5><span class="status-indicator ${statusClass}"></span>${entry.class}</h5>
                    <p>Confidence: ${entry.confidence}% | ${entry.date}</p>
                </div>
            `;
            historyGrid.appendChild(card);
        });
    }

    // Initialize history on load
    renderHistory();
});
