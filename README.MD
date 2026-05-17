# SUTPlan — Plan zajęć PŚ

Repo zawiera backend (FastAPI) i frontend (Vite + React) do pobierania i wyświetlania planów zajęć Politechniki Śląskiej.

Pliki i foldery istotne dla deweloperów:

- `backend/` — FastAPI app. Uruchamianie:
  ```bash
  cd backend
  .venv\Scripts\activate   # Windows
  uvicorn main:app --reload --port 6565
  ```

- `frontend/` —  Vite + React projekt.
