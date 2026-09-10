package com.journal.app.repository;

import com.journal.app.entity.QuoteCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface QuoteCacheRepository extends JpaRepository<QuoteCache, LocalDate> {

    /** Look up today's cached quote. Returns empty if today's quote hasn't been fetched yet. */
    Optional<QuoteCache> findByCacheDate(LocalDate cacheDate);
}
