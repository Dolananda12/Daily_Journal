package com.journal.app.repository;

import com.journal.app.entity.Target;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TargetRepository extends JpaRepository<Target, UUID> {

    /** Find a single target by its composite (type, key). */
    Optional<Target> findByTargetTypeAndTargetKey(String targetType, String targetKey);

    /**
     * List all target keys for a given type, ordered by creation date newest-first.
     * Used for GET /api/targets/list?type=semester.
     */
    @Query("SELECT t.targetKey, t.updatedAt FROM Target t WHERE t.targetType = :type ORDER BY t.createdAt DESC")
    List<Object[]> findKeysByType(@Param("type") String targetType);
}
