package com.journal.app.controller;

import com.journal.app.entity.FailureEntry;
import com.journal.app.repository.FailureEntryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/failures")
public class FailureEntryController {

    private final FailureEntryRepository repo;

    public FailureEntryController(FailureEntryRepository repo) {
        this.repo = repo;
    }

    // GET all failure entries sorted newest first
    @GetMapping
    public List<FailureEntry> getAll() {
        return repo.findAllByOrderByEntryDateDesc();
    }

    // POST create a new failure entry
    @PostMapping
    public ResponseEntity<FailureEntry> create(@RequestBody Map<String, String> body) {
        FailureEntry entry = new FailureEntry();
        entry.setEntryDate(LocalDate.parse(body.get("entryDate")));
        entry.setDescription(body.get("description"));
        entry.setTag(body.getOrDefault("tag", "Academic"));
        entry.setLesson(body.getOrDefault("lesson", ""));
        FailureEntry saved = repo.save(entry);
        return ResponseEntity.ok(saved);
    }

    // DELETE a failure entry
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
