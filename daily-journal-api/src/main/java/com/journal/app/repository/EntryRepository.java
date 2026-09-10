package com.journal.app.repository;

import com.journal.app.entity.Entry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EntryRepository extends JpaRepository<Entry, UUID> {

    /** Find one entry by its date. Used for GET /api/entries/{date} */
    Optional<Entry> findByEntryDate(LocalDate entryDate);

    /** All entries ordered newest-first. Used for GET /api/entries (metadata list). */
    List<Entry> findAllByOrderByEntryDateDesc();

    /**
     * Entries within a date range, newest-first.
     * Used for GET /api/entries?from=&to= (Browse view, Stats view).
     */
    List<Entry> findByEntryDateBetweenOrderByEntryDateDesc(LocalDate from, LocalDate to);

    /**
     * Lightweight query — only fetches entry_date and hours_studied for the calendar metadata.
     * Returns Object[] rows: [0]=entry_date, [1]=hours_studied.
     */
    @Query("SELECT e.entryDate, e.hoursStudied FROM Entry e ORDER BY e.entryDate DESC")
    List<Object[]> findAllMetadata();
}
