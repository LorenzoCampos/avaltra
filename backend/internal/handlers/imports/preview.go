package imports

import (
	"io"
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func PreviewExcelTemplate(db *pgxpool.Pool) gin.HandlerFunc {
	return previewHandler(db)
}

func previewHandler(db queryStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		accountID, exists := c.Get("account_id")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account_id not found in context"})
			return
		}
		if !isSupportedCurrency(c.PostForm("currency")) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "currency must be one of ARS, USD, EUR"})
			return
		}

		workbook, err := readWorkbookUpload(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		rows, err := parseWorkbook(workbook)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		catalog, err := loadCategoryCatalog(c.Request.Context(), db, accountID.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load categories"})
			return
		}

		c.JSON(http.StatusOK, buildPreviewResponse(rows, catalog))
	}
}

func buildPreviewResponse(rows []parsedWorkbookRow, catalog categoryCatalog) PreviewResponse {
	response := PreviewResponse{
		Importable:       make([]PreviewRow, 0),
		Invalid:          make([]PreviewRow, 0),
		Excluded:         make([]PreviewRow, 0),
		CategoryMappings: PreviewCategoryMappings{Expense: make([]MappingItem, 0), Income: make([]MappingItem, 0)},
	}

	seenMappings := map[string]struct{}{}
	for _, row := range rows {
		classified := classifyParsedRow(row, catalog)
		switch classified.Classification {
		case rowClassificationImportable:
			response.Importable = append(response.Importable, classified)
			response.Summary.Importable++
			if classified.CategoryMappingStatus == categoryMappingStatusRequired && classified.MappingKey != nil {
				if _, exists := seenMappings[*classified.MappingKey]; !exists {
					seenMappings[*classified.MappingKey] = struct{}{}
					mapping := MappingItem{SourceCategory: derefString(classified.RawCategory), NormalizedType: *classified.NormalizedType, MappingStatus: classified.CategoryMappingStatus, MappingKey: *classified.MappingKey}
					if *classified.NormalizedType == normalizedTypeExpense {
						response.CategoryMappings.Expense = append(response.CategoryMappings.Expense, mapping)
					} else {
						response.CategoryMappings.Income = append(response.CategoryMappings.Income, mapping)
					}
				}
			}
		case rowClassificationInvalid:
			response.Invalid = append(response.Invalid, classified)
			response.Summary.Invalid++
		case rowClassificationExcluded:
			response.Excluded = append(response.Excluded, classified)
			response.Summary.Excluded++
		}
	}

	sort.Slice(response.Importable, func(i, j int) bool { return response.Importable[i].RowID < response.Importable[j].RowID })
	sort.Slice(response.Invalid, func(i, j int) bool { return response.Invalid[i].RowID < response.Invalid[j].RowID })
	sort.Slice(response.Excluded, func(i, j int) bool { return response.Excluded[i].RowID < response.Excluded[j].RowID })
	sort.Slice(response.CategoryMappings.Expense, func(i, j int) bool { return response.CategoryMappings.Expense[i].MappingKey < response.CategoryMappings.Expense[j].MappingKey })
	sort.Slice(response.CategoryMappings.Income, func(i, j int) bool { return response.CategoryMappings.Income[i].MappingKey < response.CategoryMappings.Income[j].MappingKey })
	return response
}

func readWorkbookUpload(c *gin.Context) ([]byte, error) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return nil, err
	}
	openedFile, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer openedFile.Close()
	return io.ReadAll(openedFile)
}

func isSupportedCurrency(value string) bool {
	switch value {
	case "ARS", "USD", "EUR":
		return true
	default:
		return false
	}
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
