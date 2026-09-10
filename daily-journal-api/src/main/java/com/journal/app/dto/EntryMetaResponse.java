package com.journal.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Lightweight response for calendar metadata — only date and hours.
 * Used by the frontend to render calendar dots without loading full entry text.
 * JSON shape: { "entry_date": "2026-08-01", "hours_studied": 3.5 }
 */
public class EntryMetaResponse {

    @JsonProperty("entry_date")
    private LocalDate entryDate;

    @JsonProperty("hours_studied")
    private BigDecimal hoursStudied;

    public EntryMetaResponse() {}

    public EntryMetaResponse(LocalDate entryDate, BigDecimal hoursStudied) {
        this.entryDate    = entryDate;
        this.hoursStudied = hoursStudied;
    }

    public LocalDate getEntryDate()              { return entryDate; }
    public void setEntryDate(LocalDate d)        { this.entryDate = d; }

    public BigDecimal getHoursStudied()          { return hoursStudied; }
    public void setHoursStudied(BigDecimal v)    { this.hoursStudied = v; }
}
