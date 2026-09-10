package com.journal.app.service;

import com.journal.app.dto.EntryMetaResponse;
import com.journal.app.dto.EntryRequest;
import com.journal.app.dto.EntryResponse;
import com.journal.app.entity.Entry;
import com.journal.app.exception.EntryLockedException;
import com.journal.app.exception.FutureDateException;
import com.journal.app.repository.EntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Business logic for journal entries.
 *
 * Key rules (ported from Next.js route handlers, enforced server-side):
 *  1. Future dates are always rejected (FutureDateException → 400).
 *  2. Past entries are locked — cannot be edited (EntryLockedException → 403).
 *  3. "Effective today" has a 2 AM grace period: before 2 AM local time,
 *     the system treats yesterday as today so night-owl users can complete
 *     yesterday's entry.
 *
 * Timezone: Asia/Kolkata (IST) — single-user app, owner is in India.
 */
@Service
@Transactional(readOnly = true)
public class EntryService {

    /** If the hour is before this, roll "today" back to yesterday. */
    private static final int LATE_NIGHT_CUTOFF_HOUR = 2;
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private final EntryRepository entryRepository;

    public EntryService(EntryRepository entryRepository) {
        this.entryRepository = entryRepository;
    }

    // ── Effective-today helper ───────────────────────────────────

    /**
     * Returns the "effective today" for journalling:
     * before 2 AM IST, rolls back to yesterday so late-night entries
     * still count toward the previous day.
     */
    public LocalDate getEffectiveToday() {
        ZonedDateTime now = ZonedDateTime.now(IST);
        if (now.getHour() < LATE_NIGHT_CUTOFF_HOUR) {
            return now.minusDays(1).toLocalDate();
        }
        return now.toLocalDate();
    }

    // ── Read operations ──────────────────────────────────────────

    /**
     * Lightweight metadata list for calendar dots.
     * GET /api/entries (no query params)
     */
    public List<EntryMetaResponse> getAllMetadata() {
        return entryRepository.findAllMetadata().stream()
                .map(row -> new EntryMetaResponse(
                        (LocalDate) row[0],
                        row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO))
                .toList();
    }

    /**
     * Full entries within a date range (for Browse and Stats views).
     * GET /api/entries?from=&to=
     * The `to` date is automatically clamped to today so future dates
     * are never returned, consistent with the front-end's future-lock rule.
     */
    public List<EntryResponse> getRange(LocalDate from, LocalDate to) {
        LocalDate today = getEffectiveToday();
        LocalDate clampedTo = to.isAfter(today) ? today : to;
        return entryRepository
                .findByEntryDateBetweenOrderByEntryDateDesc(from, clampedTo)
                .stream()
                .map(EntryResponse::from)
                .toList();
    }

    /**
     * Single full entry for the given date.
     * GET /api/entries/{date}
     * Returns empty Optional when no entry exists (frontend renders empty form).
     */
    public Optional<EntryResponse> getByDate(LocalDate date) {
        return entryRepository.findByEntryDate(date).map(EntryResponse::from);
    }

    // ── Write operations ─────────────────────────────────────────

    /**
     * Create or update today's entry (upsert semantics).
     * PUT /api/entries/{date}
     *
     * Enforces:
     *  - date > effectiveToday → 400 (future-lock)
     *  - date < effectiveToday → 403 (past-lock / midnight-lock)
     *  - date == effectiveToday → allowed, upsert proceeds
     */
    @Transactional
    public EntryResponse upsertEntry(LocalDate date, EntryRequest request) {
        LocalDate effectiveToday = getEffectiveToday();

        if (date.isAfter(effectiveToday)) {
            throw new FutureDateException("Cannot create or update entries for future dates.");
        }
        if (date.isBefore(effectiveToday)) {
            throw new EntryLockedException("Past entries are locked and cannot be edited.");
        }

        // Find existing or create new
        Entry entry = entryRepository.findByEntryDate(date).orElse(new Entry());
        entry.setEntryDate(date);
        entry.setAcademicsNotes(request.getAcademicsNotes());
        entry.setLifeNotes(request.getLifeNotes());
        entry.setHoursStudied(request.getHoursStudied());
        entry.setDiaryNotes(request.getDiaryNotes());
        entry.setTodos(request.getTodos());

        Entry saved = entryRepository.save(entry);
        return EntryResponse.from(saved);
    }
}
