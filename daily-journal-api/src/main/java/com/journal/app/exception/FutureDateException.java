package com.journal.app.exception;

public class FutureDateException extends RuntimeException {
    public FutureDateException(String message) {
        super(message);
    }
}
