REGION=us-central1
PROJECT_ID=mckradle-3c267
DOCKER_URL=${REGION}-docker.pkg.dev/${PROJECT_ID}/${env}-arenas/web-viewer-client
IMAGE_TAG=${DOCKER_URL}:$(shell git rev-parse --short HEAD)
SERVICE_NAME=web-proxy

ifndef env
	override env = dev
endif

docker/login:
	gcloud auth configure-docker ${REGION}-docker.pkg.dev

docker/build:
	docker buildx create --platform linux/amd64,linux/arm64 --use --bootstrap --name slow-builder --driver docker-container --buildkitd-config ./buildkitd.toml
	docker buildx build --platform linux/amd64,linux/arm64 . -f Dockerfile --load -t ${IMAGE_TAG}
	docker buildx rm slow-builder

docker/push:
	docker push ${IMAGE_TAG}

deploy:
	gcloud run deploy ${SERVICE_NAME} --image ${IMAGE_TAG} --region ${REGION}