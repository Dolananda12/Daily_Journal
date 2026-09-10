package com.journal.app.dto;

import com.journal.app.entity.TargetItem;

import java.util.ArrayList;
import java.util.List;

/** Request body for PUT /api/targets?type=&key= */
public class TargetRequest {

    private List<TargetItem> items = new ArrayList<>();

    public List<TargetItem> getItems()          { return items; }
    public void setItems(List<TargetItem> i)    { this.items = i != null ? i : new ArrayList<>(); }
}
