from pydantic import BaseModel, Field, field_validator


class VerifyRequest(BaseModel):
    question: str = Field(
        ...,
        description="The query/prompt asked by the user",
        examples=["What is the capital of Australia?"],
    )
    answer: str = Field(
        ...,
        description="The LLM-generated answer to verify",
        examples=["Sydney is the capital of Australia."],
    )
    demo_mode: bool = Field(
        default=False,
        description="Run in deterministic demo mode without external dependencies",
    )

    @field_validator("question")
    @classmethod
    def validate_question_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("question cannot be empty or whitespace only")
        return stripped

    @field_validator("answer")
    @classmethod
    def validate_answer_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("answer cannot be empty or whitespace only")
        return stripped
