package com.collego.repository;

import com.collego.entity.Broadcast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BroadcastRepository extends JpaRepository<Broadcast, Long> {
    List<Broadcast> findAllByOrderByCreatedAtDesc();
    List<Broadcast> findBySenderIdOrderByCreatedAtDesc(Long senderId);
}
