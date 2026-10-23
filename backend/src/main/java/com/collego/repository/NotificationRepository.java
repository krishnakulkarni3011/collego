package com.collego.repository;

import com.collego.entity.Notification;
import com.collego.entity.NotificationCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndIsReadFalse(Long userId);
    long countByUserIdAndCategoryAndIsReadFalse(Long userId, NotificationCategory category);
    List<Notification> findTop30ByOrderByCreatedAtDesc();

    @Modifying
    @Query("update Notification n set n.isRead = true where n.user.id = :userId and n.category = :category and n.isRead = false")
    int markCategoryRead(@Param("userId") Long userId, @Param("category") NotificationCategory category);
}
