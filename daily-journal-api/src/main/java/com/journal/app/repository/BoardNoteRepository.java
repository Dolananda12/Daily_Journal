package com.journal.app.repository;

import com.journal.app.entity.BoardNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BoardNoteRepository extends JpaRepository<BoardNote, UUID> {
    List<BoardNote> findAllByOrderByCreatedAtDesc();
}
