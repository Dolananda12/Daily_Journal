package com.journal.app.repository;

import com.journal.app.entity.FailureEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FailureEntryRepository extends JpaRepository<FailureEntry, Long> {
    List<FailureEntry> findAllByOrderByEntryDateDesc();
}
