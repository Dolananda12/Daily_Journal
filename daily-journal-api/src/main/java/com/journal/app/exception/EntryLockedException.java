package com.journal.app.exception;

public class EntryLockedException extends RuntimeException {
    public EntryLockedException(String message) {
        super(message);
    }
}
