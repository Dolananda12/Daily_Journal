package com.journal.app.repository;

import com.journal.app.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {
    List<CalendarEvent> findByEventDateBetweenOrderByEventDateAsc(LocalDate start, LocalDate end);
    List<CalendarEvent> findByEventDateGreaterThanEqualOrderByEventDateAsc(LocalDate date);
    boolean existsByTitleAndEventDate(String title, LocalDate eventDate);
}
