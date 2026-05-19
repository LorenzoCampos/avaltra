package imports

import "time"

type rowClassification string

const (
	rowClassificationImportable rowClassification = "importable"
	rowClassificationInvalid    rowClassification = "invalid"
	rowClassificationExcluded   rowClassification = "excluded"
)

type normalizedType string

const (
	normalizedTypeExpense normalizedType = "expense"
	normalizedTypeIncome  normalizedType = "income"
)

type categoryMappingStatus string

const (
	categoryMappingStatusResolved      categoryMappingStatus = "resolved"
	categoryMappingStatusRequired      categoryMappingStatus = "required"
	categoryMappingStatusNotApplicable categoryMappingStatus = "not_applicable"
)

type PreviewSummary struct {
	Importable int `json:"importable"`
	Invalid    int `json:"invalid"`
	Excluded   int `json:"excluded"`
}

type PreviewRow struct {
	RowID                   string                `json:"row_id"`
	Sheet                   string                `json:"sheet"`
	SheetRow                int                   `json:"sheet_row"`
	Classification          rowClassification     `json:"classification"`
	NormalizedType          *normalizedType       `json:"normalized_type"`
	Date                    *string               `json:"date"`
	Description             string                `json:"description"`
	Amount                  *float64              `json:"amount"`
	RawCategory             *string               `json:"raw_category"`
	RawPaymentMethod        *string               `json:"raw_payment_method"`
	PaymentMethod           *string               `json:"payment_method"`
	SourceContainerID       *string               `json:"source_container_id,omitempty"`
	SourceInstrumentID      *string               `json:"source_instrument_id,omitempty"`
	DestinationContainerID  *string               `json:"destination_container_id,omitempty"`
	DestinationInstrumentID *string               `json:"destination_instrument_id,omitempty"`
	CategoryMappingStatus   categoryMappingStatus `json:"category_mapping_status"`
	SuggestedCategoryID     *string               `json:"suggested_category_id,omitempty"`
	SuggestedCategoryName   *string               `json:"suggested_category_name,omitempty"`
	MappingKey              *string               `json:"mapping_key,omitempty"`
	ReasonCodes             []string              `json:"reason_codes"`
}

type MappingItem struct {
	SourceCategory        string                `json:"source_category"`
	NormalizedType        normalizedType        `json:"normalized_type"`
	SuggestedCategoryID   *string               `json:"suggested_category_id"`
	SuggestedCategoryName *string               `json:"suggested_category_name"`
	MappingStatus         categoryMappingStatus `json:"mapping_status"`
	MappingKey            string                `json:"mapping_key"`
}

type PreviewCategoryMappings struct {
	Expense []MappingItem `json:"expense"`
	Income  []MappingItem `json:"income"`
}

type PreviewResponse struct {
	Summary          PreviewSummary          `json:"summary"`
	Importable       []PreviewRow            `json:"importable"`
	Invalid          []PreviewRow            `json:"invalid"`
	Excluded         []PreviewRow            `json:"excluded"`
	CategoryMappings PreviewCategoryMappings `json:"category_mappings"`
}

type commitDecisions struct {
	ApprovedRowIDs []string          `json:"approved_row_ids"`
	CategoryMap    map[string]string `json:"category_map"`
}

type CommitCreatedSummary struct {
	Expense int `json:"expense"`
	Income  int `json:"income"`
}

type CommitSkippedSummary struct {
	Total    int            `json:"total"`
	ByReason map[string]int `json:"by_reason"`
}

type CommitResponse struct {
	Created CommitCreatedSummary `json:"created"`
	Skipped CommitSkippedSummary `json:"skipped"`
}

type parsedWorkbookRow struct {
	RowID            string
	SheetName        string
	NormalizedSheet  string
	SheetRow         int
	Date             time.Time
	Description      string
	Amount           float64
	RawType          string
	RawPaymentMethod string
	RawCategory      string
	DateValid        bool
	AmountValid      bool
	Blank            bool
}

type categoryOption struct {
	ID   string
	Name string
	Type normalizedType
}

type categoryCatalog struct {
	expenseByName   map[string]categoryOption
	incomeByName    map[string]categoryOption
	visibleByID     map[string]categoryOption
	paymentContexts paymentContextCatalog
}

type paymentContextRef struct {
	ContainerID  *string
	InstrumentID *string
}

type paymentContextCatalog struct {
	byLookupKey map[string][]paymentContextRef
}
