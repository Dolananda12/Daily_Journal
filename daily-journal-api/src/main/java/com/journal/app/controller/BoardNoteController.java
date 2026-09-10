package com.journal.app.controller;

import com.journal.app.dto.BoardNoteRequest;
import com.journal.app.entity.BoardNote;
import com.journal.app.repository.BoardNoteRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/board-notes")
public class BoardNoteController {

    private final BoardNoteRepository repository;

    public BoardNoteController(BoardNoteRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<BoardNote> getAllNotes() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping
    public BoardNote createNote(@RequestBody BoardNoteRequest request) {
        BoardNote note = new BoardNote();
        note.setContent(request.getContent());
        if (request.getColor() != null) {
            note.setColor(request.getColor());
        }
        return repository.save(note);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<BoardNote> updateNote(@PathVariable UUID id, @RequestBody BoardNoteRequest request) {
        return repository.findById(id).map(note -> {
            if (request.getContent() != null) {
                note.setContent(request.getContent());
            }
            if (request.getColor() != null) {
                note.setColor(request.getColor());
            }
            BoardNote updated = repository.save(note);
            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable UUID id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
