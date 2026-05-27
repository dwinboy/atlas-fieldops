from locust import HttpUser, between, task


class ApiUser(HttpUser):
    wait_time = between(0.2, 1.0)

    @task
    def health(self) -> None:
        self.client.get("/api/v1/health")

