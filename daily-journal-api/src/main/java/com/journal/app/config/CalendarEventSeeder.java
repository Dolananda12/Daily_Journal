package com.journal.app.config;

import com.journal.app.entity.CalendarEvent;
import com.journal.app.repository.CalendarEventRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
public class CalendarEventSeeder implements CommandLineRunner {

    private final CalendarEventRepository calendarEventRepository;

    public CalendarEventSeeder(CalendarEventRepository calendarEventRepository) {
        this.calendarEventRepository = calendarEventRepository;
    }

    @Override
    public void run(String... args) {
        List<EventSeed> seedData = new ArrayList<>(List.of(
            new EventSeed(LocalDate.of(2026, 8, 13), "[DCMOS] Quiz #1"),
            new EventSeed(LocalDate.of(2026, 9, 3), "[DCMOS] Midsem Exam"),
            new EventSeed(LocalDate.of(2026, 9, 8), "[Detection & Estimation] Quiz"),
            new EventSeed(LocalDate.of(2026, 9, 8), "[Embedded Systems] Quiz"),
            new EventSeed(LocalDate.of(2026, 9, 10), "[DCMOS] Project Paper Submission"),
            new EventSeed(LocalDate.of(2026, 9, 24), "[DCMOS] Assignment #1 + Assignment Quiz"),
            new EventSeed(LocalDate.of(2026, 10, 8), "[DCMOS] Quiz #2"),
            new EventSeed(LocalDate.of(2026, 10, 13), "[DCMOS] Midterm Exam Week"),
            new EventSeed(LocalDate.of(2026, 10, 29), "[DCMOS] Assignment #2 + Assignment Quiz"),
            new EventSeed(LocalDate.of(2026, 11, 5), "[DCMOS] Exam #2"),
            new EventSeed(LocalDate.of(2026, 11, 10), "[DCMOS] Project Submission & Demo"),
            new EventSeed(LocalDate.of(2026, 11, 17), "[DCMOS] Project Submission & Demo"),
            new EventSeed(LocalDate.of(2026, 11, 24), "[DCMOS] Project Submission & Demo"),
            new EventSeed(LocalDate.of(2026, 12, 1), "[DCMOS] Project Submission & Demo"),
            new EventSeed(LocalDate.of(2026, 12, 8), "[DCMOS] Final Exam Week"),
            new EventSeed(LocalDate.of(2026, 12, 15), "[DCMOS] Grades Submission")
        ));

        // Add ACMOS Quiz every Wednesday from Aug 2026 to Dec 2026
        LocalDate wStart = LocalDate.of(2026, 8, 1);
        LocalDate wEnd = LocalDate.of(2026, 12, 31);
        for (LocalDate date = wStart; !date.isAfter(wEnd); date = date.plusDays(1)) {
            if (date.getDayOfWeek() == DayOfWeek.WEDNESDAY) {
                seedData.add(new EventSeed(date, "[ACMOS] Quiz"));
            }
        }

        // Save seeds if not existing
        for (EventSeed seed : seedData) {
            if (!calendarEventRepository.existsByTitleAndEventDate(seed.title, seed.date)) {
                CalendarEvent event = new CalendarEvent();
                event.setEventDate(seed.date);
                event.setTitle(seed.title);
                calendarEventRepository.save(event);
            }
        }
    }

    private record EventSeed(LocalDate date, String title) {}
}
