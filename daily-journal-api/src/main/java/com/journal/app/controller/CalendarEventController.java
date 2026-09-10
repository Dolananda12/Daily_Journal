package com.journal.app.controller;

import com.journal.app.entity.CalendarEvent;
import com.journal.app.repository.CalendarEventRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "${app.cors-allowed-origins}")
public class CalendarEventController {

    private final CalendarEventRepository calendarEventRepository;

    public CalendarEventController(CalendarEventRepository calendarEventRepository) {
        this.calendarEventRepository = calendarEventRepository;
    }

    @GetMapping
    public List<CalendarEvent> getEvents(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        
        if (start != null && end != null) {
            return calendarEventRepository.findByEventDateBetweenOrderByEventDateAsc(start, end);
        } else {
            return calendarEventRepository.findAll();
        }
    }

    @GetMapping("/upcoming")
    public List<CalendarEvent> getUpcomingEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from) {
        return calendarEventRepository.findByEventDateGreaterThanEqualOrderByEventDateAsc(from);
    }

    @PostMapping
    public CalendarEvent createEvent(@RequestBody CalendarEvent event) {
        return calendarEventRepository.save(event);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        if (!calendarEventRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        calendarEventRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
