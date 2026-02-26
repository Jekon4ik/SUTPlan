# SUTPlan — Plan zajęć PŚ

Repo zawiera backend (FastAPI) i frontend (Vite + React) do pobierania i wyświetlania planów zajęć Politechniki Śląskiej.

Pliki i foldery istotne dla deweloperów:

- `backend/` — FastAPI app. Uruchamianie:
  ```bash
  cd backend
  .venv\Scripts\activate   # Windows
  uvicorn main:app --reload --port 6565
  ```

- `frontend/` — (planowany) Vite + React projekt.

Notatki bezpieczeństwa:
- Nie commituj `backend/.env` ani `/.venv/` — są wymienione w `.gitignore`.
- Umieść prywatne wartości (np. `CURL_EXE` jeśli zmieniasz) w lokalnym `.env` i nie publikuj.

Jeśli chcesz, mogę zainicjować frontend scaffold (Vite + Tailwind) teraz.
