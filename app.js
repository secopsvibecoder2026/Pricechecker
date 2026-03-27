const openFormBtn = document.getElementById('openFormBtn');
const closeBtn    = document.getElementById('closeBtn');
const overlay     = document.getElementById('overlay');
const modal       = document.getElementById('modal');
const uploadArea  = document.getElementById('uploadArea');
const imageInput  = document.getElementById('imageInput');
const preview     = document.getElementById('preview');
const placeholder = document.getElementById('uploadPlaceholder');
const priceForm   = document.getElementById('priceForm');
const result      = document.getElementById('result');
const estimateVal = document.getElementById('estimateValue');
const resetBtn    = document.getElementById('resetBtn');

// Open / close modal
openFormBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);

function openModal() {
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  overlay.classList.add('hidden');
}

// Image upload — click
uploadArea.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (file) showPreview(file);
});

// Image upload — drag and drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) showPreview(file);
});

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

// Form submit — mock price estimate
priceForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name      = document.getElementById('productName').value.trim();
  const condition = document.getElementById('condition').value;
  const age       = parseInt(document.getElementById('age').value) || 0;

  const estimate = mockEstimate(name, condition, age);

  estimateVal.textContent = formatPrice(estimate);
  priceForm.classList.add('hidden');
  result.classList.remove('hidden');
});

// Reset
resetBtn.addEventListener('click', () => {
  priceForm.reset();
  preview.src = '';
  preview.classList.add('hidden');
  placeholder.classList.remove('hidden');
  result.classList.add('hidden');
  priceForm.classList.remove('hidden');
});

// Simple mock estimate — will be replaced with real API calls
function mockEstimate(name, condition, age) {
  const base = 1000 + (name.length * 47);
  const conditionFactor = { ny: 1.0, 'pent-brukt': 0.7, brukt: 0.5, slitt: 0.3 };
  const ageFactor = Math.max(0.2, 1 - age * 0.08);
  return Math.round(base * (conditionFactor[condition] ?? 0.6) * ageFactor / 10) * 10;
}

function formatPrice(amount) {
  return amount.toLocaleString('nb-NO') + ' kr';
}
