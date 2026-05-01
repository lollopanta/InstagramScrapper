FROM python:3.12-alpine

WORKDIR /app

RUN apk add --no-cache build-base libxml2-dev libxslt-dev

COPY apps/scraper-python/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY apps/scraper-python/src ./src

ENV PYTHONUNBUFFERED=1
ENV IG_COOKIE_FILE=/app/apps/api/cookie.json

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
