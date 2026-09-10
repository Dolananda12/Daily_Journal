package com.journal.app;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
        "SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/test",
        "SPRING_DATASOURCE_USERNAME=test",
        "SPRING_DATASOURCE_PASSWORD=test",
        "CORS_ALLOWED_ORIGINS=http://localhost:3000"
})
class JournalApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the Spring context wires up correctly.
        // For full integration tests, use @DataJpaTest with an embedded DB or Testcontainers.
    }
}
