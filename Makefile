REGION=us-central1
PROJECT_ID=mckradle-3c267
DOCKER_URL=${REGION}-docker.pkg.dev/${PROJECT_ID}/${env}-minecraft/web-proxy
IMAGE_TAG=${DOCKER_URL}:latest
SERVICE_NAME=web-proxy

ifndef env
	override env = dev
endif

docker/login:
	gcloud auth configure-docker ${REGION}-docker.pkg.dev

docker/build:
	docker buildx build --platform linux/amd64 . -f Dockerfile.proxy --load -t ${IMAGE_TAG}

docker/push:
	docker push ${IMAGE_TAG}

deploy:
	gcloud run deploy ${SERVICE_NAME} --image ${IMAGE_TAG} --region ${REGION}