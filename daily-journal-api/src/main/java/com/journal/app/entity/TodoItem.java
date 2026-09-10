package com.journal.app.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Objects;

/**
 * POJO representing one to-do item stored in the JSONB `todos` column of the entries table.
 * Shape: { "id": "abc123", "text": "Read chapter 5", "done": false }
 */
public class TodoItem {

    private String id;
    private String text;
    private boolean done;

    public TodoItem() {}

    public TodoItem(String id, String text, boolean done) {
        this.id   = id;
        this.text = text;
        this.done = done;
    }

    public String getId()          { return id; }
    public void setId(String id)   { this.id = id; }

    public String getText()            { return text; }
    public void setText(String text)   { this.text = text; }

    @JsonProperty("done")
    public boolean isDone()            { return done; }
    public void setDone(boolean done)  { this.done = done; }
}
