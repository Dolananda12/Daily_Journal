package com.journal.app.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Objects;

/**
 * POJO representing one target item stored in the JSONB `items` column of the targets table.
 * Shape: { "id": "abc123", "text": "Finish DSA module", "done": false }
 */
public class TargetItem {

    private String id;
    private String text;
    private boolean done;

    public TargetItem() {}

    public TargetItem(String id, String text, boolean done) {
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
