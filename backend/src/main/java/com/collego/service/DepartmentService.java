package com.collego.service;

import com.collego.dto.CreateDepartmentRequest;
import com.collego.dto.DepartmentResponse;
import com.collego.entity.Department;
import com.collego.exception.ConflictException;
import com.collego.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    @Transactional
    public DepartmentResponse createDepartment(CreateDepartmentRequest request) {
        if (departmentRepository.existsByName(request.getName())) {
            throw new ConflictException("Department name already exists: " + request.getName());
        }
        if (departmentRepository.existsByCode(request.getCode())) {
            throw new ConflictException("Department code already exists: " + request.getCode());
        }

        Department department = Department.builder()
                .name(request.getName())
                .code(request.getCode())
                .description(request.getDescription())
                .build();

        department = departmentRepository.save(department);
        return mapToResponse(department);
    }

    public List<DepartmentResponse> getAllDepartments() {
        return departmentRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private DepartmentResponse mapToResponse(Department department) {
        return DepartmentResponse.builder()
                .id(department.getId())
                .name(department.getName())
                .code(department.getCode())
                .description(department.getDescription())
                .createdAt(department.getCreatedAt() != null ? department.getCreatedAt() : java.time.LocalDateTime.now())
                .build();
    }
}
