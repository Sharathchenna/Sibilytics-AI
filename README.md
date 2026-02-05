# Sibilytics AI

Sibilytics AI is a web-based platform for signal processing, feature extraction, and ML-driven analysis. It combines a Next.js frontend with a FastAPI backend to deliver wavelet/FFT analysis, SVM classification, and ANN regression in a single workflow.

**Highlights**
- Signal processing with wavelet decomposition, FFT, and statistical feature extraction
- ML tooling for SVM classification and ANN regression/inverse problems
- Interactive visualizations for time/frequency/spectrogram analysis

**Repo Layout**
- `frontend/`: Next.js app (UI and client-side logic)
- `backend/`: FastAPI service (signal processing, ML, data viz)
- `docs/`: Product and technical documentation
- `test-data/`: Sample datasets and test files
- `experiments/`: Standalone experiments and scratch scripts

**Quickstart**

Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Open:
- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Frontend: `http://localhost:3000`

**Docs**
- Product and architecture docs live in `docs/`
- Backend API guide: `backend/README.md`

**Test Data**
Sample files are in `test-data/`. The header detection tests in `backend/test_header_detection.py` read from that folder.

**Git LFS (Large Files)**
Large `.lvm` datasets should be tracked with Git LFS to keep the repo small and fast. If you don’t have LFS installed, install it and run:
```bash
git lfs install
git lfs track "*.lvm"
```

**License**
Not specified yet.
