package com.journal.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.journal.app.entity.TodoItem;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Request body for PUT /api/entries/{date} */
public class EntryRequest {

    @JsonProperty("academics_notes")
    private String academicsNotes;
    
    @JsonProperty("life_notes")
    private String lifeNotes;
    
    @JsonProperty("hours_studied")
    private BigDecimal hoursStudied;
    
    @JsonProperty("diary_notes")
    private String diaryNotes;
    
    private List<TodoItem> todos = new ArrayList<>();

    public String getAcademicsNotes()              { return academicsNotes; }
    public void setAcademicsNotes(String s)        { this.academicsNotes = s; }

    public String getLifeNotes()                   { return lifeNotes; }
    public void setLifeNotes(String s)             { this.lifeNotes = s; }

    public BigDecimal getHoursStudied()            { return hoursStudied; }
    public void setHoursStudied(BigDecimal v)      { this.hoursStudied = v; }

    public String getDiaryNotes()                  { return diaryNotes; }
    public void setDiaryNotes(String s)            { this.diaryNotes = s; }

    public List<TodoItem> getTodos()               { return todos; }
    public void setTodos(List<TodoItem> t)         { this.todos = t != null ? t : new ArrayList<>(); }
}
